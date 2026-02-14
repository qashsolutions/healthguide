---
name: healthguide-caregiver-evv
description: Electronic Visit Verification (EVV) for HealthGuide caregivers. GPS-based check-in/out with QR code fallback, location verification, and time tracking. Use when building check-in screens, location capture, or EVV compliance features.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: caregiver
  tags: [evv, gps, check-in, check-out, location, compliance]
---

# HealthGuide Caregiver EVV

## Overview
Electronic Visit Verification captures when and where caregivers perform visits. Primary method is GPS verification with QR code fallback. All check-ins/outs trigger notifications to family members and agency.

## EVV Requirements

- **Location**: GPS coordinates within acceptable radius of careseeker's address
- **Time**: Timestamp of check-in and check-out
- **Verification**: QR code fallback if GPS unavailable
- **Notifications**: Alert family and agency on check-in/out

## Data Flow

```
Caregiver taps "Check In"
        ↓
Request location permission
        ↓
Capture GPS coordinates
        ↓
Verify within radius of careseeker address
        ↓
If OK → Record check-in + notify
If FAIL → Offer QR fallback
```

## Instructions

### Step 1: Location Service

```typescript
// services/location.ts
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
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

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula - returns distance in meters
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

export function isWithinRadius(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number = 100 // Default 100m radius
): boolean {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= radiusMeters;
}
```

### Step 2: Check-In Screen

```typescript
// app/(protected)/caregiver/visit/[id]/check-in.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  requestLocationPermission,
  getCurrentLocation,
  isWithinRadius,
} from '@/services/location';
import { Visit } from '@/types/scheduling';
import { TapButton } from '@/components/ui/TapButton';
import { LocationIcon, CheckIcon, AlertIcon, QRIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/platform';

const EVV_RADIUS_METERS = 150; // 150 meter acceptable radius

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchVisit();
  }, []);

  async function fetchVisit() {
    const { data } = await supabase
      .from('visits')
      .select(`
        *,
        careseeker:careseekers(
          full_name,
          address,
          latitude,
          longitude
        )
      `)
      .eq('id', id)
      .single();

    if (data) setVisit(data);
  }

  async function handleCheckIn() {
    setStatus('locating');
    setErrorMessage('');

    // Request permission if needed
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setStatus('error');
      setErrorMessage('Location permission required for check-in');
      return;
    }

    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      setStatus('error');
      setErrorMessage('Could not get your location. Please try again.');
      return;
    }

    setStatus('verifying');

    // Verify within radius of careseeker's address
    const withinRadius = isWithinRadius(
      location.latitude,
      location.longitude,
      visit!.careseeker.latitude,
      visit!.careseeker.longitude,
      EVV_RADIUS_METERS
    );

    if (!withinRadius) {
      setStatus('error');
      setErrorMessage(
        'You appear to be too far from the client\'s location. ' +
        'Please move closer or use QR code check-in.'
      );
      return;
    }

    // Record check-in
    try {
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'checked_in',
          actual_start: new Date().toISOString(),
          check_in_latitude: location.latitude,
          check_in_longitude: location.longitude,
        })
        .eq('id', id);

      if (error) throw error;

      // Trigger notifications (handled by database trigger/edge function)
      await supabase.functions.invoke('notify-check-in', {
        body: { visit_id: id },
      });

      // Success feedback
      await hapticFeedback('medium');
      Vibration.vibrate(200);

      setStatus('success');

      // Navigate to tasks after short delay
      setTimeout(() => {
        router.replace(`/caregiver/visit/${id}/tasks`);
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage('Could not complete check-in. Please try again.');
    }
  }

  function handleQRFallback() {
    router.push(`/caregiver/visit/${id}/qr-checkin`);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.clientName}>{visit?.careseeker?.full_name}</Text>
        <Text style={styles.address}>{visit?.careseeker?.address}</Text>
      </View>

      {/* Main Check-in Area */}
      <View style={styles.checkInArea}>
        {status === 'idle' && (
          <>
            <TapButton
              icon={<LocationIcon size={64} color="#FFFFFF" />}
              label="TAP TO CHECK IN"
              variant="success"
              size="large"
              onPress={handleCheckIn}
            />
            <Text style={styles.instruction}>
              Make sure you're at the client's location
            </Text>
          </>
        )}

        {status === 'locating' && (
          <View style={styles.statusContainer}>
            <LocationIcon size={64} color="#3B82F6" />
            <Text style={styles.statusText}>Getting your location...</Text>
          </View>
        )}

        {status === 'verifying' && (
          <View style={styles.statusContainer}>
            <LocationIcon size={64} color="#F59E0B" />
            <Text style={styles.statusText}>Verifying location...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <View style={styles.successCircle}>
              <CheckIcon size={80} color="#FFFFFF" />
            </View>
            <Text style={styles.successText}>Checked In!</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <AlertIcon size={64} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <View style={styles.errorActions}>
              <TapButton
                icon={<LocationIcon size={32} color="#FFFFFF" />}
                label="Try Again"
                variant="neutral"
                size="medium"
                onPress={handleCheckIn}
              />
              <TapButton
                icon={<QRIcon size={32} color="#FFFFFF" />}
                label="QR Code"
                variant="neutral"
                size="medium"
                onPress={handleQRFallback}
              />
            </View>
          </View>
        )}
      </View>

      {/* QR Fallback Option (always visible when idle) */}
      {status === 'idle' && (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Having trouble?</Text>
          <TapButton
            icon={<QRIcon size={32} color="#3B82F6" />}
            label="Use QR Code"
            variant="neutral"
            size="medium"
            onPress={handleQRFallback}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: '#6B7280',
  },
  checkInArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  instruction: {
    marginTop: 24,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    marginTop: 16,
    fontSize: 18,
    color: '#374151',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 32,
  },
  fallback: {
    alignItems: 'center',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  fallbackText: {
    marginBottom: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
```

### Step 3: QR Code Check-In (Fallback)

```typescript
// app/(protected)/caregiver/visit/[id]/qr-checkin.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export default function QRCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    try {
      // Expected format: healthguide://checkin/{careseeker_id}/{visit_id}
      const url = new URL(data);
      if (url.protocol !== 'healthguide:') {
        throw new Error('Invalid QR code');
      }

      const [, action, careseekerId, visitId] = url.pathname.split('/');

      if (action !== 'checkin' || visitId !== id) {
        throw new Error('QR code does not match this visit');
      }

      // Record check-in without GPS
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'checked_in',
          actual_start: new Date().toISOString(),
          check_in_method: 'qr_code',
        })
        .eq('id', id);

      if (error) throw error;

      // Notify
      await supabase.functions.invoke('notify-check-in', {
        body: { visit_id: id, method: 'qr_code' },
      });

      router.replace(`/caregiver/visit/${id}/tasks`);
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Please scan the QR code at the client\'s home.');
      setScanned(false);
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access needed to scan QR code</Text>
        <Button title="Allow Camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.instruction}>
          Scan the QR code at the client's home
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 20,
  },
  instruction: {
    marginTop: 32,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    margin: 24,
  },
});
```

### Step 4: Check-Out Screen

```typescript
// app/(protected)/caregiver/visit/[id]/check-out.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation } from '@/services/location';
import { TapButton } from '@/components/ui/TapButton';
import { CheckIcon, LocationIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/platform';

export default function CheckOutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  async function handleCheckOut() {
    setStatus('processing');

    try {
      // Get location for check-out
      const location = await getCurrentLocation();

      // Update visit
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'checked_out',
          actual_end: new Date().toISOString(),
          check_out_latitude: location?.latitude,
          check_out_longitude: location?.longitude,
        })
        .eq('id', id);

      if (error) throw error;

      // Trigger check-out notifications
      await supabase.functions.invoke('notify-check-out', {
        body: { visit_id: id },
      });

      // Success feedback
      await hapticFeedback('medium');
      Vibration.vibrate(200);

      setStatus('success');

      // Return to home after delay
      setTimeout(() => {
        router.replace('/caregiver/today');
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Could not complete check-out. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'idle' && (
          <>
            <Text style={styles.title}>Ready to leave?</Text>
            <Text style={styles.subtitle}>
              Make sure all tasks are completed
            </Text>

            <TapButton
              icon={<LocationIcon size={64} color="#FFFFFF" />}
              label="TAP TO CHECK OUT"
              variant="error"
              size="large"
              onPress={handleCheckOut}
            />
          </>
        )}

        {status === 'processing' && (
          <View style={styles.processing}>
            <Text style={styles.processingText}>Checking out...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.success}>
            <View style={styles.successCircle}>
              <CheckIcon size={80} color="#FFFFFF" />
            </View>
            <Text style={styles.successText}>Checked Out!</Text>
            <Text style={styles.thankYou}>Great job today!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  processing: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    color: '#374151',
  },
  success: {
    alignItems: 'center',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
  thankYou: {
    marginTop: 8,
    fontSize: 18,
    color: '#6B7280',
  },
});
```

## Troubleshooting

### Location permission denied
**Cause:** User declined permission
**Solution:** Show explanation and link to settings; offer QR fallback

### GPS inaccurate
**Cause:** Poor signal or indoor location
**Solution:** Use `Location.Accuracy.High` and increase radius tolerance

### Check-in fails validation
**Cause:** Careseeker address not geocoded
**Solution:** Ensure addresses have latitude/longitude in database
