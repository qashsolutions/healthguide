// HealthGuide Connectivity Monitor
// Monitors network connectivity state for offline-first features

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { useEffect, useState, useCallback } from 'react';

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: NetInfoStateType | null;
  details: NetInfoState['details'];
}

// Hook to monitor connectivity state
export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
    details: null,
  });

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((netState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable ?? false,
        connectionType: netState.type,
        details: netState.details,
      });
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable ?? false,
        connectionType: netState.type,
        details: netState.details,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}

// Simple hook that returns true when we can sync
export function useCanSync() {
  const { isConnected, isInternetReachable } = useConnectivity();
  return isConnected && isInternetReachable;
}

// Hook that triggers callback when coming back online
export function useOnReconnect(callback: () => void) {
  const { isConnected, isInternetReachable } = useConnectivity();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const isOnline = isConnected && isInternetReachable;

    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      callback();
      setWasOffline(false);
    }
  }, [isConnected, isInternetReachable, wasOffline, callback]);
}

// Utility function to check connectivity once
export async function checkConnectivity(): Promise<ConnectivityState> {
  const netState = await NetInfo.fetch();
  return {
    isConnected: netState.isConnected ?? false,
    isInternetReachable: netState.isInternetReachable ?? false,
    connectionType: netState.type,
    details: netState.details,
  };
}

// Check if we're on WiFi (useful for large syncs)
export function useIsOnWifi() {
  const { connectionType } = useConnectivity();
  return connectionType === NetInfoStateType.wifi;
}

// Get connection quality description
export function useConnectionQuality(): 'good' | 'fair' | 'poor' | 'offline' {
  const { isConnected, isInternetReachable, connectionType, details } = useConnectivity();

  if (!isConnected || !isInternetReachable) {
    return 'offline';
  }

  // WiFi is generally good
  if (connectionType === NetInfoStateType.wifi) {
    return 'good';
  }

  // Check cellular generation if available
  if (connectionType === NetInfoStateType.cellular && details) {
    const cellularDetails = details as { cellularGeneration?: string };
    if (cellularDetails.cellularGeneration === '4g' || cellularDetails.cellularGeneration === '5g') {
      return 'good';
    }
    if (cellularDetails.cellularGeneration === '3g') {
      return 'fair';
    }
    return 'poor';
  }

  return 'fair';
}
