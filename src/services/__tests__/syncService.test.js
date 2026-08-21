import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import { syncAll, subscribeToSync } from '../syncService';
import { addToQueue, getQueue } from '../offlineQueue';
import { setIsOnline } from '../networkService';

jest.mock('../../store/authStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ token: 'test-token', clearAuth: jest.fn() });
  return { __esModule: true, default: mockStore };
});

jest.mock('../../store/configStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ apiBaseUrl: '' });
  return { __esModule: true, default: mockStore };
});

describe('syncService.syncAll', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(client);
    setIsOnline(true);
  });

  afterEach(async () => {
    mock.restore();
    await AsyncStorage.clear();
  });

  it('does nothing when offline', async () => {
    setIsOnline(false);
    await addToQueue({ type: 'create_fault', payload: { description: 'x' } });

    const events = [];
    const unsubscribe = subscribeToSync((e) => events.push(e));

    await syncAll();
    unsubscribe();

    expect(events).toEqual([]);
    expect(await getQueue()).toHaveLength(1);
  });

  it('creates a fault, sends the Idempotency-Key, and clears the queue on success', async () => {
    const entry = await addToQueue({ type: 'create_fault', payload: { description: 'Fuga de aceite' } });
    mock.onPost('/fallas').reply(200, { data: { id: 55 } });

    const events = [];
    const unsubscribe = subscribeToSync((e) => events.push(e));

    await syncAll();
    unsubscribe();

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].headers['Idempotency-Key']).toBe(entry.localId);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ description: 'Fuga de aceite' });

    expect(await getQueue()).toEqual([]);
    expect(events).toEqual([
      { type: 'sync_started' },
      { type: 'operation_completed', localId: entry.localId, result: { status: 'created', serverId: 55 } },
      { type: 'sync_completed' },
    ]);
  });

  it('updates a fault against /fallas/:server_id', async () => {
    const entry = await addToQueue({ type: 'update_fault', payload: { server_id: 7, description: 'Actualizada' } });
    mock.onPut('/fallas/7').reply(200, { data: { id: 7 } });

    await syncAll();

    expect(mock.history.put).toHaveLength(1);
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ description: 'Actualizada' });
    expect(await getQueue()).toEqual([]);
  });

  it('closes a fault against /fallas/:server_id/close', async () => {
    await addToQueue({ type: 'close_fault', payload: { server_id: 9, closed: true } });
    mock.onPost('/fallas/9/close').reply(200, { data: { id: 9 } });

    await syncAll();

    expect(mock.history.post).toHaveLength(1);
    expect(await getQueue()).toEqual([]);
  });

  it('keeps the entry queued and bumps retries on a network/5xx failure', async () => {
    const entry = await addToQueue({ type: 'create_fault', payload: { description: 'x' } });
    mock.onPost('/fallas').networkError();

    const events = [];
    const unsubscribe = subscribeToSync((e) => events.push(e));

    await syncAll();
    unsubscribe();

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].localId).toBe(entry.localId);
    expect(queue[0].retries).toBe(1);
    expect(queue[0].lastError).toEqual(expect.any(String));
    expect(events.map((e) => e.type)).toEqual(['sync_started', 'sync_partial']);
  });

  it('drops the entry and reports a conflict on 409/422', async () => {
    const entry = await addToQueue({ type: 'update_fault', payload: { server_id: 3, description: 'x' } });
    mock.onPut('/fallas/3').reply(409, { message: 'Ya fue modificada', data: { id: 3 } });

    const events = [];
    const unsubscribe = subscribeToSync((e) => events.push(e));

    await syncAll();
    unsubscribe();

    expect(await getQueue()).toEqual([]);
    expect(events).toEqual([
      { type: 'sync_started' },
      {
        type: 'operation_conflict',
        localId: entry.localId,
        result: { status: 'conflict', message: 'Ya fue modificada', serverId: 3, currentState: { id: 3 } },
      },
      { type: 'sync_completed' },
    ]);
  });

  it('drops the entry and reports an error on other 4xx responses', async () => {
    const entry = await addToQueue({ type: 'create_fault', payload: {} });
    mock.onPost('/fallas').reply(400, { message: 'Datos inválidos' });

    const events = [];
    const unsubscribe = subscribeToSync((e) => events.push(e));

    await syncAll();
    unsubscribe();

    expect(await getQueue()).toEqual([]);
    expect(events).toEqual([
      { type: 'sync_started' },
      { type: 'operation_error', localId: entry.localId, result: { status: 'error', message: 'Datos inválidos' } },
      { type: 'sync_completed' },
    ]);
  });

  it('drops entries with an unknown operation type', async () => {
    const entry = await addToQueue({ type: 'bogus_op', payload: {} });

    await syncAll();

    expect(await getQueue()).toEqual([]);
  });

  it('does not run two syncs concurrently', async () => {
    await addToQueue({ type: 'create_fault', payload: {} });
    mock.onPost('/fallas').reply(() =>
      new Promise((resolve) => setTimeout(() => resolve([200, { data: { id: 1 } }]), 50))
    );

    const first = syncAll();
    const second = syncAll();
    await Promise.all([first, second]);

    expect(mock.history.post).toHaveLength(1);
  });
});
