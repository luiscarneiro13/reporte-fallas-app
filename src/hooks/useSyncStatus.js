import { useState, useEffect } from 'react';
import { subscribeToSync } from '../services/syncService';
import { getQueueSize } from '../services/offlineQueue';

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    getQueueSize().then(setPendingCount);

    const unsub = subscribeToSync((event) => {
      switch (event.type) {
        case 'sync_started':
          setIsSyncing(true);
          break;
        case 'sync_completed':
          setIsSyncing(false);
          setPendingCount(0);
          break;
        case 'sync_partial':
          setIsSyncing(false);
          setPendingCount(event.remaining);
          break;
        case 'operation_completed':
        case 'operation_conflict':
        case 'operation_error':
          getQueueSize().then(setPendingCount);
          break;
      }
    });

    return unsub;
  }, []);

  return { pendingCount, isSyncing };
}
