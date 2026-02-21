// HealthGuide Check-Out Screen
// Per healthguide-caregiver/evv skill - GPS check-out with success feedback

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TapButton } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, createShadow } from '@/theme/spacing';
import { CheckIcon, LocationIcon, ClockIcon } from '@/components/icons';
import { hapticFeedback, vibrate } from '@/utils/haptics';
import { getCurrentLocation } from '@/services/location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInMinutes, parseISO, format } from 'date-fns';
import { EmergencySOS } from '@/components/caregiver/EmergencySOS';

type CheckOutStatus = 'idle' | 'processing' | 'success';

interface AssignmentData {
  id: string;
  status: string;
  actual_start: string | null;
  elder: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface TaskCounts {
  completed: number;
  total: number;
}

export default function CheckOutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<CheckOutStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ completed: 0, total: 0 });
  const [visitDuration, setVisitDuration] = useState('--');
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; phone: string; relationship: string }[]>([]);

  // Fetch assignment and task data
  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch assignment with elder info
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('visits')
        .select(`
          id,
          status,
          actual_start,
          elder:elders (
            id,
            first_name,
            last_name,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship
          )
        `)
        .eq('id', id)
        .single();

      if (assignmentError) throw assignmentError;
      // Transform Supabase join (array) to object
      const transformed = {
        ...assignmentData,
        elder: Array.isArray(assignmentData.elder) ? assignmentData.elder[0] : assignmentData.elder,
      };
      setAssignment(transformed);

      // Fetch emergency contacts
      const elderData = transformed.elder as any;
      const contacts: { name: string; phone: string; relationship: string }[] = [];
      if (elderData?.emergency_contact_name && elderData?.emergency_contact_phone) {
        contacts.push({
          name: elderData.emergency_contact_name,
          phone: elderData.emergency_contact_phone,
          relationship: elderData.emergency_contact_relationship || 'Emergency Contact',
        });
      }
      if (elderData?.id) {
        const { data: ecData } = await supabase
          .from('emergency_contacts')
          .select('name, phone, relationship')
          .eq('elder_id', elderData.id);
        (ecData || []).forEach((ec: any) => {
          if (!contacts.some((c) => c.phone === ec.phone)) {
            contacts.push(ec);
          }
        });
      }
      setEmergencyContacts(contacts);

      // Calculate visit duration
      if (transformed?.actual_start) {
        const checkInTime = parseISO(assignmentData.actual_start);
        const now = new Date();
        const minutes = differenceInMinutes(now, checkInTime);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setVisitDuration(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
      }

      // Fetch task counts
      const { data: tasksData, error: tasksError } = await supabase
        .from('visit_tasks')
        .select('id, status')
        .eq('visit_id', id);

      if (!tasksError && tasksData) {
        const completed = tasksData.filter(t => t.status === 'completed').length;
        setTaskCounts({ completed, total: tasksData.length });
      }
    } catch (error) {
      console.error('Error fetching checkout data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update duration every minute while on screen
  useEffect(() => {
    if (!assignment?.actual_start) return;

    const interval = setInterval(() => {
      const checkInTime = parseISO(assignment.actual_start!);
      const now = new Date();
      const minutes = differenceInMinutes(now, checkInTime);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setVisitDuration(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    }, 60000);

    return () => clearInterval(interval);
  }, [assignment?.actual_start]);

  const clientName = assignment
    ? `${assignment.elder.first_name} ${assignment.elder.last_name}`
    : 'Loading...';

  async function handleCheckOut() {
    setStatus('processing');

    try {
      // Get current location for check-out
      const location = await getCurrentLocation();

      // Update assignment in Supabase
      const { error: updateError } = await supabase
        .from('visits')
        .update({
          status: 'completed',
          actual_end: new Date().toISOString(),
          check_out_latitude: location?.latitude || null,
          check_out_longitude: location?.longitude || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Try to trigger notifications via Edge Function (non-blocking)
      try {
        await supabase.functions.invoke('notify-check-out', {
          body: {
            visit_id: id,
            elder_id: assignment?.elder.id,
            caregiver_id: user?.id,
          },
        });
      } catch (notifyError) {
        // Don't fail check-out if notification fails
        console.warn('Notification error (non-fatal):', notifyError);
      }

      // Success feedback
      await hapticFeedback('success');
      vibrate(200);

      setStatus('success');

      // Redirect to rate visit after brief success display
      setTimeout(() => {
        router.replace(`/(protected)/caregiver/rate-visit?visitId=${id}` as any);
      }, 2500);

    } catch (error) {
      console.error('Check-out error:', error);
      await hapticFeedback('error');
      Alert.alert(
        'Check-Out Error',
        'Could not complete check-out. Please try again.',
        [{ text: 'OK', onPress: () => setStatus('idle') }]
      );
    }
  }

  function handleBack() {
    Alert.alert(
      'Not checked out yet',
      'Are you sure you want to go back without checking out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Back', onPress: () => router.back() },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
          <Text style={styles.loadingText}>Loading visit data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        {status === 'idle' && (
          <>
            {/* Visit Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.clientName}>{clientName}</Text>

              <View style={styles.summaryRow}>
                <ClockIcon size={24} color={colors.text.secondary} />
                <Text style={styles.summaryText}>Visit duration: {visitDuration}</Text>
              </View>

              <View style={styles.summaryRow}>
                <CheckIcon size={24} color={colors.success[500]} />
                <Text style={styles.summaryText}>
                  Tasks completed: {taskCounts.completed}/{taskCounts.total}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>Ready to leave?</Text>
            <Text style={styles.subtitle}>
              Make sure all tasks are completed before checking out
            </Text>

            {/* Check Out Button */}
            <View style={styles.checkOutButtonContainer}>
              <TapButton
                icon={<LocationIcon size={48} color={colors.white} />}
                label="TAP TO CHECK OUT"
                variant="error"
                size="xlarge"
                onPress={handleCheckOut}
              />
            </View>

            {/* Go Back Option */}
            <View style={styles.backSection}>
              <TapButton
                icon={<CheckIcon size={24} color={colors.text.secondary} />}
                label="Go Back"
                variant="neutral"
                size="medium"
                onPress={handleBack}
              />
            </View>
          </>
        )}

        {status === 'processing' && (
          <View style={styles.statusContainer}>
            <View style={styles.processingCircle}>
              <LocationIcon size={48} color={colors.primary[500]} />
            </View>
            <Text style={styles.processingText}>Checking out...</Text>
            <Text style={styles.processingSubtext}>Saving your visit data</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <View style={styles.successCircle}>
              <CheckIcon size={64} color={colors.white} />
            </View>
            <Text style={styles.successText}>Checked Out!</Text>
            <Text style={styles.thankYouText}>Great job today!</Text>

            <View style={styles.successDetails}>
              <Text style={styles.successDetailText}>
                Visit completed with {clientName}
              </Text>
              <Text style={styles.successDetailText}>
                Duration: {visitDuration}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Emergency SOS — only show before checkout completes */}
      {status === 'idle' && id && assignment && (
        <EmergencySOS
          visitId={id}
          elderName={clientName}
          emergencyContacts={emergencyContacts}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    marginBottom: spacing[8],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  clientName: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  summaryText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  checkOutButtonContainer: {
    marginBottom: spacing[6],
  },
  backSection: {
    marginTop: spacing[4],
  },
  statusContainer: {
    alignItems: 'center',
  },
  processingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  processingText: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  processingSubtext: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  successCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
    ...createShadow(8, 0.4, 16, 12, colors.success[500]),
  },
  successText: {
    ...typography.styles.h1,
    color: colors.success[600],
    marginBottom: spacing[2],
  },
  thankYouText: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[6],
  },
  successDetails: {
    alignItems: 'center',
    gap: spacing[1],
  },
  successDetailText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[4],
  },
});
