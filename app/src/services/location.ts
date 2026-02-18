// HealthGuide Location Service
// Per healthguide-caregiver/evv skill - GPS verification for check-in/out

import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

/**
 * Request foreground location permission
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if location permission is granted
 */
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get current location with high accuracy
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if user is within acceptable radius of target location
 * @param radiusMeters Default 150 meters for EVV compliance
 */
export function isWithinRadius(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number = 150
): boolean {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= radiusMeters;
}

/**
 * Format distance for display (US units: feet and miles)
 */
export function formatDistance(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 1000) {
    return `${Math.round(feet)} ft`;
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Watch location with real-time updates (balanced accuracy for battery saving)
 * Returns a subscription that must be removed on cleanup
 */
export async function watchLocation(
  onUpdate: (location: LocationData) => void,
  onError?: (error: Error) => void
): Promise<Location.LocationSubscription> {
  try {
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        throw new Error('Location permission not granted');
      }
    }

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (loc) =>
        onUpdate({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: loc.timestamp,
        })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to watch location');
    if (onError) {
      onError(err);
    }
    throw err;
  }
}

// EVV Constants
export const EVV_RADIUS_METERS = 150; // Acceptable check-in radius
