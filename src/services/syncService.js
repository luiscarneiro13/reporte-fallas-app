import client from '../api/client';
import { getQueue, removeFromQueue, updateQueueEntry } from './offlineQueue';
import { getIsOnline } from './networkService';

const syncListeners = new Set();
let isSyncing = false;

export function subscribeToSync(fn) {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

function notify(event) {
  syncListeners.forEach((fn) => fn(event));
}

async function syncOperation(entry) {
  const { localId, type, payload } = entry;

  try {
    let res;
    switch (type) {
      case 'create_fault': {
        res = await client.post('/fallas', payload, {
          headers: { 'Idempotency-Key': localId },
        });
        const serverId = res.data?.data?.id;
        return { status: 'created', serverId };
      }
      case 'update_fault': {
        const { server_id, ...data } = payload;
        res = await client.put(`/fallas/${server_id}`, data, {
          headers: { 'Idempotency-Key': localId },
        });
        return { status: 'updated', serverId: server_id };
      }
      case 'close_fault': {
        const { server_id: closeId, ...closeData } = payload;
        res = await client.post(`/fallas/${closeId}/close`, closeData, {
          headers: { 'Idempotency-Key': localId },
        });
        return { status: 'closed', serverId: closeId };
      }
      default:
        return { status: 'error', message: `Unknown operation type: ${type}` };
    }
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    if (!status || status >= 500) {
      return { status: 'retry', message: 'Server error, will retry' };
    }

    if (status === 409 || status === 422) {
      return {
        status: 'conflict',
        message: data?.message || 'Conflict error',
        serverId: data?.data?.id,
        currentState: data?.data,
      };
    }

    return { status: 'error', message: data?.message || err.message };
  }
}

export async function syncAll() {
  if (isSyncing || !getIsOnline()) return;
  isSyncing = true;
  notify({ type: 'sync_started' });

  try {
    const queue = await getQueue();
    for (const entry of queue) {
      const result = await syncOperation(entry);

      switch (result.status) {
        case 'created':
        case 'updated':
        case 'closed':
          await removeFromQueue(entry.localId);
          notify({ type: 'operation_completed', localId: entry.localId, result });
          break;

        case 'conflict':
          await removeFromQueue(entry.localId);
          notify({ type: 'operation_conflict', localId: entry.localId, result });
          break;

        case 'retry':
          await updateQueueEntry(entry.localId, {
            retries: entry.retries + 1,
            lastError: result.message,
          });
          break;

        case 'error':
          await removeFromQueue(entry.localId);
          notify({ type: 'operation_error', localId: entry.localId, result });
          break;
      }
    }

    const remaining = await getQueue();
    if (remaining.length === 0) {
      notify({ type: 'sync_completed' });
    } else {
      notify({ type: 'sync_partial', remaining: remaining.length });
    }
  } finally {
    isSyncing = false;
  }
}
