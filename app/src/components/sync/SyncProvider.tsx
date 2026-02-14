// HealthGuide Sync Provider
// Context provider for sync state and operations

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useConnectivity, useOnReconnect } from '@/lib/connectivity';
import { syncQueueManager, SyncStatusInfo, prefetchCaregiverData, getCacheStats } from '@/lib/sync';

interface SyncContextValue {
  syncStatus: SyncStatusInfo;
  isOnline: boolean;
  triggerSync: () => Promise<void>;
  retryFailed: () => Promise<void>;
  prefetchData: (caregiverId: string) => Promise<void>;
  cacheStats: {
    elders: number;
    assignments: number;
    tasks: number;
    observations: number;
    pendingSync: number;
  } | null;
  refreshCacheStats: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
  caregiverId?: string;
  autoPrefetch?: boolean;
}

export function SyncProvider({
  children,
  caregiverId,
  autoPrefetch = true,
}: SyncProviderProps) {
  const { isConnected, isInternetReachable } = useConnectivity();
  const isOnline = isConnected && isInternetReachable;

  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    lastError: null,
    isAvailable: false,
  });

  const [cacheStats, setCacheStats] = useState<SyncContextValue['cacheStats']>(null);

  // Subscribe to sync queue changes
  useEffect(() => {
    const unsubscribe = syncQueueManager.subscribe((status) => {
      setSyncStatus({ ...status, isOnline });
    });

    // Get initial status
    syncQueueManager.getStatus().then((status) => {
      setSyncStatus({ ...status, isOnline });
    });

    return () => unsubscribe();
  }, [isOnline]);

  // Refresh cache stats
  const refreshCacheStats = useCallback(async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  }, []);

  // Initial cache stats load
  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  // Trigger sync when coming online
  useOnReconnect(useCallback(() => {
    if (syncStatus.pendingCount > 0) {
      console.log('[SyncProvider] Back online, triggering sync');
      syncQueueManager.processQueue();
    }
  }, [syncStatus.pendingCount]));

  // Auto-prefetch data when online and caregiver ID is available
  useEffect(() => {
    if (autoPrefetch && caregiverId && isOnline) {
      prefetchCaregiverData(caregiverId)
        .then(() => refreshCacheStats())
        .catch((err) => console.error('[SyncProvider] Prefetch error:', err));
    }
  }, [caregiverId, isOnline, autoPrefetch, refreshCacheStats]);

  // Sync on app becoming active
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && isOnline && syncStatus.pendingCount > 0) {
        console.log('[SyncProvider] App active, triggering sync');
        syncQueueManager.processQueue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isOnline, syncStatus.pendingCount]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      console.log('[SyncProvider] Cannot sync while offline');
      return;
    }
    await syncQueueManager.processQueue();
    await refreshCacheStats();
  }, [isOnline, refreshCacheStats]);

  // Retry failed items
  const retryFailed = useCallback(async () => {
    await syncQueueManager.retryFailed();
    await refreshCacheStats();
  }, [refreshCacheStats]);

  // Prefetch data for a caregiver
  const prefetchData = useCallback(async (id: string) => {
    if (!isOnline) {
      console.log('[SyncProvider] Cannot prefetch while offline');
      return;
    }
    await prefetchCaregiverData(id);
    await refreshCacheStats();
  }, [isOnline, refreshCacheStats]);

  const value: SyncContextValue = {
    syncStatus: { ...syncStatus, isOnline },
    isOnline,
    triggerSync,
    retryFailed,
    prefetchData,
    cacheStats,
    refreshCacheStats,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

// Hook to use sync context
export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

// Hook to check if currently syncing
export function useIsSyncing() {
  const { syncStatus } = useSync();
  return syncStatus.isSyncing;
}

// Hook to get pending sync count
export function usePendingSyncCount() {
  const { syncStatus } = useSync();
  return syncStatus.pendingCount;
}

// Hook to check if there are failed syncs
export function useHasFailedSyncs() {
  const { syncStatus } = useSync();
  return syncStatus.failedCount > 0;
}
