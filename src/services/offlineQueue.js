import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@ironflow_offline_queue';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToQueue(operation) {
  const queue = await getQueue();
  const entry = {
    localId: generateId(),
    type: operation.type,
    payload: operation.payload,
    createdAt: new Date().toISOString(),
    retries: 0,
    lastError: null,
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

export async function removeFromQueue(localId) {
  const queue = await getQueue();
  const filtered = queue.filter((e) => e.localId !== localId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function updateQueueEntry(localId, updates) {
  const queue = await getQueue();
  const idx = queue.findIndex((e) => e.localId === localId);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueSize() {
  const queue = await getQueue();
  return queue.length;
}
