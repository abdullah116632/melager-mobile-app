import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { flushQueue, subscribeQueueSize } from '@/lib/offlineQueue';

interface NetworkContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  syncNow: async () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOfflineRef = useRef(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    return subscribeQueueSize(setPendingCount);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await flushQueue();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // Treat null/unknown as online — only go offline when explicitly false
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online && wasOfflineRef.current) {
        syncNow();
      }
      wasOfflineRef.current = !online;
    });
    return unsub;
  }, [syncNow]);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingCount, isSyncing, syncNow }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  return useContext(NetworkContext);
}
