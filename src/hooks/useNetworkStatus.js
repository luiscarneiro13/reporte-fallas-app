import { useState, useEffect } from 'react';
import { subscribeToConnectivity } from '../services/networkService';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = subscribeToConnectivity(setIsOnline);
    return unsub;
  }, []);

  return isOnline;
}
