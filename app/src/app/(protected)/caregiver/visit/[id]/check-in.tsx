// HealthGuide Check-In Screen
// Per healthguide-caregiver/evv skill - GPS verification with QR fallback

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TapButton, Button, Card } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius } from '@/theme/spacing';
import {
  LocationIcon,
  CheckIcon,
  XIcon,
  QRCodeIcon,
  PersonIcon,
  ArrowLeftIcon,
} from '@/components/icons';
import {
  requestLocationPermission,
  getCurrentLocation,
  isWithinRadius,
  EVV_RADIUS_METERS,
  formatDistance,
  calculateDistance,
} from '@/services/location';
import { hapticFeedback, vibrate } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

type CheckInStatus = 'loading' | 'idle' | 'locating' | 'verifying' | 'success' | 'error';

interface AssignmentData {
  id: string;
  elder: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  scheduled_date: string;
  start_time: string;
  end_time: string;
}

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<CheckInStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Fetch assignment data
  useEffect(() => {
    async function fetchAssignment() {
      if (!id) return;

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          elder:elders (
            id,
            first_name,
            last_name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching assignment:', error);
        setErrorMessage('Could not load visit details');
        setStatus('error');
        return;
      }

      // Transform Supabase join (array) to object
      const transformed = {
        ...data,
        elder: Array.isArray(data.elder) ? data.elder[0] : data.elder,
      };
      setAssignment(transformed);
      setStatus('idle');
    }

    fetchAssignment();
  }, [id]);

  const handleCheckIn = async () => {
    if (!assignment) return;

    setStatus('locating');
    setErrorMessage('');

    // Request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setStatus('error');
      setErrorMessage('Location permission is required for check-in. Please enable it in settings.');
      return;
    }

    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      setStatus('error');
      setErrorMessage('Could not get your location. Please try again or use QR code.');
      return;
    }

    setStatus('verifying');

    // Calculate distance to elder's location
    const dist = calculateDistance(
      location.latitude,
      location.longitude,
      assignment.elder.latitude,
      assignment.elder.longitude
    );
    setDistance(dist);

    // Verify within radius
    const withinRadius = isWithinRadius(
      location.latitude,
      location.longitude,
      assignment.elder.latitude,
      assignment.elder.longitude,
      EVV_RADIUS_METERS
    );

    if (!withinRadius) {
      setStatus('error');
      setErrorMessage(
        `You are ${formatDistance(dist)} away from the client's location. Please move closer or use QR code check-in.`
      );
      return;
    }

    // Record check-in to Supabase
    const { error: updateError } = await supabase
      .from('visits')
      .update({
        status: 'in_progress',
        actual_check_in: new Date().toISOString(),
        check_in_latitude: location.latitude,
        check_in_longitude: location.longitude,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error recording check-in:', updateError);
      setStatus('error');
      setErrorMessage('Could not record check-in. Please try again.');
      return;
    }

    // Success!
    await hapticFeedback('success');
    vibrate(200);
    setStatus('success');

    // Navigate to tasks after delay
    setTimeout(() => {
      router.replace(`/(protected)/caregiver/visit/${id}/tasks`);
    }, 1500);
  };

  const handleQRFallback = () => {
    router.push(`/(protected)/caregiver/visit/${id}/qr-checkin`);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
          <Text style={styles.loadingText}>Loading visit details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title=""
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={24} />}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Check In</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Client Info */}
      {assignment && (
        <Card variant="default" padding="lg" style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <PersonIcon size={32} color={roleColors.careseeker} />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {assignment.elder.first_name} {assignment.elder.last_name}
              </Text>
              <Text style={styles.clientAddress}>{assignment.elder.address}</Text>
              <Text style={styles.clientTime}>
                {formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Main Check-In Area */}
      <View style={styles.content}>
        {status === 'idle' && (
          <>
            <TapButton
              icon={<LocationIcon size={72} color={colors.white} />}
              label="TAP TO CHECK IN"
              variant="success"
              size="xlarge"
              onPress={handleCheckIn}
            />
            <Text style={styles.instruction}>
              Make sure you're at the client's location
            </Text>
          </>
        )}

        {status === 'locating' && (
          <View style={styles.statusContainer}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color={roleColors.caregiver} />
            </View>
            <Text style={styles.statusText}>Getting your location...</Text>
          </View>
        )}

        {status === 'verifying' && (
          <View style={styles.statusContainer}>
            <View style={[styles.loadingCircle, { backgroundColor: colors.warning[100] }]}>
              <LocationIcon size={48} color={colors.warning[500]} />
            </View>
            <Text style={styles.statusText}>Verifying location...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <View style={styles.successCircle}>
              <CheckIcon size={80} color={colors.white} />
            </View>
            <Text style={styles.successText}>Checked In!</Text>
            <Text style={styles.successSubtext}>Starting your visit...</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <View style={styles.errorCircle}>
              <XIcon size={64} color={colors.white} />
            </View>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <View style={styles.errorActions}>
              <TapButton
                icon={<LocationIcon size={32} color={colors.white} />}
                label="Try Again"
                variant="primary"
                size="medium"
                onPress={handleCheckIn}
              />
              <TapButton
                icon={<QRCodeIcon size={32} color={roleColors.caregiver} />}
                label="QR Code"
                variant="neutral"
                size="medium"
                onPress={handleQRFallback}
              />
            </View>
          </View>
        )}
      </View>

      {/* QR Fallback (always visible when idle) */}
      {status === 'idle' && (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Having trouble?</Text>
          <Button
            title="Use QR Code Instead"
            variant="secondary"
            size="lg"
            icon={<QRCodeIcon size={24} color={roleColors.caregiver} />}
            onPress={handleQRFallback}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
  },
  clientCard: {
    margin: spacing[4],
    marginBottom: 0,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: roleColors.careseeker + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  clientAddress: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  clientTime: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  instruction: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[6],
  },
  statusContainer: {
    alignItems: 'center',
  },
  loadingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[4],
  },
  successCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    ...typography.caregiver.heading,
    color: colors.success[600],
    marginTop: spacing[4],
  },
  successSubtext: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  errorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.error[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.caregiver.body,
    color: colors.error[600],
    textAlign: 'center',
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[6],
  },
  fallback: {
    alignItems: 'center',
    padding: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  fallbackText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
});
