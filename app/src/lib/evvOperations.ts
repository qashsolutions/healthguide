// HealthGuide EVV Operations
// Network-aware wrapper: tries Supabase first, falls back to offline queue

import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { offlineCheckIn, offlineCheckOut } from './sync/offlineOperations';

export interface EvvResult {
  offline: boolean;
  error?: string;
}

/**
 * Check in to a visit — online via Supabase or queued offline.
 */
export async function evvCheckIn(
  visitId: string,
  latitude: number,
  longitude: number
): Promise<EvvResult> {
  const netState = await NetInfo.fetch();

  if (netState.isConnected) {
    const { error } = await supabase
      .from('visits')
      .update({
        status: 'in_progress',
        actual_start: new Date().toISOString(),
        check_in_latitude: latitude,
        check_in_longitude: longitude,
      })
      .eq('id', visitId);

    if (error) return { offline: false, error: error.message };
    return { offline: false };
  }

  // Offline fallback
  try {
    await offlineCheckIn(visitId, latitude, longitude);
    return { offline: true };
  } catch (err: any) {
    return { offline: true, error: err?.message || 'Offline queue failed' };
  }
}

/**
 * Check out from a visit — online via Supabase or queued offline.
 */
export async function evvCheckOut(
  visitId: string,
  latitude: number | null,
  longitude: number | null
): Promise<EvvResult> {
  const netState = await NetInfo.fetch();

  if (netState.isConnected) {
    const { error } = await supabase
      .from('visits')
      .update({
        status: 'completed',
        actual_end: new Date().toISOString(),
        check_out_latitude: latitude,
        check_out_longitude: longitude,
      })
      .eq('id', visitId);

    if (error) return { offline: false, error: error.message };
    return { offline: false };
  }

  // Offline fallback
  try {
    await offlineCheckOut(visitId, latitude ?? 0, longitude ?? 0);
    return { offline: true };
  } catch (err: any) {
    return { offline: true, error: err?.message || 'Offline queue failed' };
  }
}
