import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getQueue,
  addToQueue,
  removeFromQueue,
  updateQueueEntry,
  clearQueue,
  getQueueSize,
} from '../offlineQueue';

describe('offlineQueue', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts empty', async () => {
    expect(await getQueue()).toEqual([]);
    expect(await getQueueSize()).toBe(0);
  });

  it('adds an operation with generated metadata', async () => {
    const entry = await addToQueue({ type: 'create_fault', payload: { description: 'Fuga' } });

    expect(entry.localId).toEqual(expect.any(String));
    expect(entry.type).toBe('create_fault');
    expect(entry.payload).toEqual({ description: 'Fuga' });
    expect(entry.retries).toBe(0);
    expect(entry.lastError).toBeNull();
    expect(entry.createdAt).toEqual(expect.any(String));

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toEqual(entry);
  });

  it('appends multiple operations preserving order', async () => {
    const first = await addToQueue({ type: 'create_fault', payload: { a: 1 } });
    const second = await addToQueue({ type: 'update_fault', payload: { b: 2 } });

    const queue = await getQueue();
    expect(queue.map((e) => e.localId)).toEqual([first.localId, second.localId]);
    expect(await getQueueSize()).toBe(2);
  });

  it('generates unique localIds across entries', async () => {
    const first = await addToQueue({ type: 'create_fault', payload: {} });
    const second = await addToQueue({ type: 'create_fault', payload: {} });

    expect(first.localId).not.toBe(second.localId);
  });

  it('removes an entry by localId without touching the rest', async () => {
    const first = await addToQueue({ type: 'create_fault', payload: {} });
    const second = await addToQueue({ type: 'update_fault', payload: {} });

    await removeFromQueue(first.localId);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].localId).toBe(second.localId);
  });

  it('removing a missing localId is a no-op', async () => {
    await addToQueue({ type: 'create_fault', payload: {} });
    await removeFromQueue('does-not-exist');

    expect(await getQueueSize()).toBe(1);
  });

  it('updates fields on an existing entry', async () => {
    const entry = await addToQueue({ type: 'create_fault', payload: {} });

    await updateQueueEntry(entry.localId, { retries: 3, lastError: 'Server error' });

    const [updated] = await getQueue();
    expect(updated.retries).toBe(3);
    expect(updated.lastError).toBe('Server error');
    expect(updated.localId).toBe(entry.localId);
  });

  it('updating a missing localId leaves the queue untouched', async () => {
    const entry = await addToQueue({ type: 'create_fault', payload: {} });

    await updateQueueEntry('does-not-exist', { retries: 5 });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toEqual(entry);
  });

  it('clears the whole queue', async () => {
    await addToQueue({ type: 'create_fault', payload: {} });
    await addToQueue({ type: 'update_fault', payload: {} });

    await clearQueue();

    expect(await getQueue()).toEqual([]);
  });

  it('getQueue returns [] when storage holds invalid JSON', async () => {
    await AsyncStorage.setItem('@ironflow_offline_queue', 'not-json');

    expect(await getQueue()).toEqual([]);
  });
});
