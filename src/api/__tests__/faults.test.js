import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../client';
import { createFault, updateFault } from '../faults';
import { getQueue } from '../../services/offlineQueue';
import { setIsOnline } from '../../services/networkService';

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

describe('api/faults offline-aware writes', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(client);
    setIsOnline(true);
  });

  afterEach(async () => {
    mock.restore();
    await AsyncStorage.clear();
  });

  describe('createFault', () => {
    it('posts directly when online', async () => {
      mock.onPost('/fallas').reply(201, { data: { id: 1 } });

      const result = await createFault({ description: 'Fuga' });

      expect(mock.history.post).toHaveLength(1);
      expect(result).toEqual({ data: { id: 1 } });
      expect(await getQueue()).toEqual([]);
    });

    it('queues the operation instead of hitting the network when offline', async () => {
      setIsOnline(false);

      const result = await createFault({ description: 'Fuga' });

      expect(mock.history.post).toHaveLength(0);
      expect(result.offline).toBe(true);
      expect(result.localId).toEqual(expect.any(String));

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'create_fault',
        payload: { description: 'Fuga' },
      });
    });
  });

  describe('updateFault', () => {
    it('puts directly when online', async () => {
      mock.onPut('/fallas/12').reply(200, { data: { id: 12 } });

      const result = await updateFault(12, { description: 'Editada' });

      expect(mock.history.put).toHaveLength(1);
      expect(result).toEqual({ data: { id: 12 } });
      expect(await getQueue()).toEqual([]);
    });

    it('queues the operation with server_id when offline', async () => {
      setIsOnline(false);

      const result = await updateFault(12, { description: 'Editada' });

      expect(mock.history.put).toHaveLength(0);
      expect(result.offline).toBe(true);
      expect(result.localId).toEqual(expect.any(String));

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'update_fault',
        payload: { server_id: 12, description: 'Editada' },
      });
    });
  });
});
