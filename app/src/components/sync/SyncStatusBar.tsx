// HealthGuide Sync Status Bar
// Shows sync status and pending changes indicator

import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useConnectivity } from '@/lib/connectivity';
import { syncQueueManager, SyncStatusInfo } from '@/lib/sync/SyncQueueManager';
import { CloudIcon, SyncIcon, AlertIcon, HourglassIcon } from '@/components/icons';

interface SyncStatusBarProps {
  onPress?: () => void;
}

export function SyncStatusBar({ onPress }: SyncStatusBarProps) {
  const { isConnected, isInternetReachable } = useConnectivity();
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    lastError: null,
    isAvailable: false,
  });

  const spinAnim = useRef(new Animated.Value(0)).current;
  const isOnline = isConnected && isInternetReachable;

  // Subscribe to sync status changes
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

  // Update online status when connectivity changes
  useEffect(() => {
    setSyncStatus((prev) => ({ ...prev, isOnline }));
  }, [isOnline]);

  // Animate sync icon when syncing
  useEffect(() => {
    if (syncStatus.isSyncing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [syncStatus.isSyncing, spinAnim]);

  // Trigger sync when coming online with pending changes
  useEffect(() => {
    if (isOnline && syncStatus.pendingCount > 0 && !syncStatus.isSyncing) {
      syncQueueManager.processQueue();
    }
  }, [isOnline, syncStatus.pendingCount, syncStatus.isSyncing]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (isOnline && !syncStatus.isSyncing) {
      // Trigger manual sync
      syncQueueManager.processQueue();
    }
  }, [onPress, isOnline, syncStatus.isSyncing]);

  // Hide when everything is synced and online
  if (isOnline && syncStatus.pendingCount === 0 && syncStatus.failedCount === 0) {
    return null;
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusContent = () => {
    if (!isOnline) {
      return {
        icon: <CloudIcon size={16} color="#FFFFFF" />,
        text: `Offline${syncStatus.pendingCount > 0 ? ` • ${syncStatus.pendingCount} pending` : ''}`,
        style: styles.offline,
      };
    }

    if (syncStatus.isSyncing) {
      return {
        icon: <SyncIcon size={16} color="#FFFFFF" />,
        text: `Syncing ${syncStatus.pendingCount} change${syncStatus.pendingCount !== 1 ? 's' : ''}...`,
        style: styles.syncing,
        animated: true,
      };
    }

    if (syncStatus.failedCount > 0) {
      return {
        icon: <AlertIcon size={16} color="#FFFFFF" />,
        text: `${syncStatus.failedCount} failed • Tap to retry`,
        style: styles.failed,
      };
    }

    if (syncStatus.pendingCount > 0) {
      return {
        icon: <HourglassIcon size={16} color="#FFFFFF" />,
        text: `${syncStatus.pendingCount} change${syncStatus.pendingCount !== 1 ? 's' : ''} pending`,
        style: styles.pending,
      };
    }

    return null;
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <Pressable
      style={[styles.container, content.style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={content.text}
    >
      {content.animated ? (
        <Animated.View style={[styles.icon, { transform: [{ rotate: spin }] }]}>
          {content.icon}
        </Animated.View>
      ) : (
        <View style={styles.icon}>{content.icon}</View>
      )}
      <Text style={styles.text}>{content.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offline: {
    backgroundColor: '#EF4444', // Red for offline
  },
  syncing: {
    backgroundColor: '#3B82F6', // Blue for syncing
  },
  pending: {
    backgroundColor: '#F59E0B', // Amber for pending
  },
  failed: {
    backgroundColor: '#DC2626', // Dark red for failed
  },
  icon: {
    width: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
