// HealthGuide Visit Detail Screen
// Entry point for a visit - shows summary and start button

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { PersonIcon, LocationIcon, ClockIcon, ArrowLeftIcon, AlertIcon } from '@/components/icons';
import { cancelVisit, isLateCancellation } from '@/lib/cancelVisit';
import { cancelRecurringSeries } from '@/lib/recurringVisits';
import { useAuth } from '@/contexts/AuthContext';
import {
  MealIcon,
  CompanionshipIcon,
  CleaningIcon,
  MedicationIcon,
} from '@/components/icons/TaskIcons';

interface VisitData {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  special_instructions?: string;
  is_recurring?: boolean;
  parent_visit_id?: string | null;
  elder: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
  };
  tasks: {
    id: string;
    name: string;
    category: string;
    status: string;
  }[];
}

const TaskIcon = ({ category, size = 32 }: { category: string; size?: number }) => {
  switch (category) {
    case 'meal_prep':
      return <MealIcon size={size} />;
    case 'medication':
      return <MedicationIcon size={size} />;
    case 'housekeeping':
      return <CleaningIcon size={size} />;
    case 'companionship':
      return <CompanionshipIcon size={size} />;
    default:
      return null;
  }
};

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [visit, setVisit] = useState<VisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchVisit = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch assignment with elder and tasks
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('visits')
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          special_instructions,
          is_recurring,
          parent_visit_id,
          elder:elders (
            id,
            first_name,
            last_name,
            address,
            city,
            state,
            zip_code
          )
        `)
        .eq('id', id)
        .single();

      if (assignmentError) throw assignmentError;

      // Fetch tasks for this assignment
      const { data: tasksData, error: tasksError } = await supabase
        .from('visit_tasks')
        .select(`
          id,
          status,
          task:task_library (
            name,
            category
          )
        `)
        .eq('visit_id', id);

      if (tasksError) throw tasksError;

      // Transform Supabase join (array) to object
      const elderData = Array.isArray(assignmentData.elder)
        ? assignmentData.elder[0]
        : assignmentData.elder;

      const formattedTasks = (tasksData || []).map((t: any) => {
        const taskDef = Array.isArray(t.task) ? t.task[0] : t.task;
        return {
          id: t.id,
          name: taskDef?.name || 'Unknown Task',
          category: taskDef?.category || 'other',
          status: t.status,
        };
      });

      setVisit({
        id: assignmentData.id,
        status: assignmentData.status,
        scheduled_start: assignmentData.scheduled_start,
        scheduled_end: assignmentData.scheduled_end,
        special_instructions: assignmentData.special_instructions,
        is_recurring: assignmentData.is_recurring,
        parent_visit_id: assignmentData.parent_visit_id,
        elder: elderData,
        tasks: formattedTasks,
      });
    } catch (error) {
      console.error('Error fetching visit:', error);
      // Use mock data as fallback
      setVisit({
        id: id!,
        status: 'scheduled',
        scheduled_start: '10:30',
        scheduled_end: '12:30',
        elder: {
          id: 'mock',
          first_name: 'John',
          last_name: 'Davis',
          address: '123 Oak Street',
          city: 'Anytown',
          state: 'CA',
          zip_code: '90210',
        },
        tasks: [
          { id: '1', name: 'Meal preparation', category: 'meal_prep', status: 'pending' },
          { id: '2', name: 'Medication reminder', category: 'medication', status: 'pending' },
          { id: '3', name: 'Light housekeeping', category: 'housekeeping', status: 'pending' },
          { id: '4', name: 'Companionship', category: 'companionship', status: 'pending' },
        ],
      });
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchVisit();
  }, [fetchVisit]);

  const doSingleCancel = async () => {
    if (!id || !user?.id) return;
    setCancelling(true);
    const result = await cancelVisit(id, 'companion', user.id);
    setCancelling(false);

    if (result.success) {
      const msg = result.isLate
        ? 'Visit cancelled. A negative rating has been recorded due to short notice.'
        : 'Visit cancelled successfully.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Cancelled', msg);
      router.back();
    } else {
      const errMsg = result.error || 'Could not cancel visit';
      Platform.OS === 'web' ? alert(errMsg) : Alert.alert('Error', errMsg);
    }
  };

  const doCancelSeries = async () => {
    if (!visit) return;
    const parentId = visit.is_recurring ? visit.id : visit.parent_visit_id;
    if (!parentId) return;

    setCancelling(true);
    const result = await cancelRecurringSeries(parentId);
    setCancelling(false);

    if (result.success) {
      const msg = `Recurring series cancelled. ${result.cancelled} future visit${result.cancelled !== 1 ? 's' : ''} removed.`;
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Series Cancelled', msg);
      router.back();
    } else {
      const errMsg = result.error || 'Could not cancel series';
      Platform.OS === 'web' ? alert(errMsg) : Alert.alert('Error', errMsg);
    }
  };

  async function handleCancelVisit() {
    if (!id || !user?.id || !visit) return;

    const isRecurringChild = !!visit.parent_visit_id;
    const isRecurringParent = !!visit.is_recurring;
    const isPartOfSeries = isRecurringChild || isRecurringParent;

    const late = isLateCancellation(visit.scheduled_start);

    if (isPartOfSeries) {
      // Show "this visit only" vs "all future visits" choice
      if (Platform.OS === 'web') {
        const choice = window.prompt(
          'This is a recurring visit.\n\nType "1" to cancel this visit only\nType "2" to cancel all future visits in this series',
          '1',
        );
        if (choice === '1') doSingleCancel();
        else if (choice === '2') doCancelSeries();
      } else {
        Alert.alert(
          'Cancel Recurring Visit?',
          late
            ? 'This is a recurring visit. Cancelling this visit with short notice will result in a negative rating.'
            : 'This is a recurring visit.',
          [
            { text: 'Keep', style: 'cancel' },
            { text: 'This Visit Only', onPress: doSingleCancel },
            { text: 'All Future Visits', style: 'destructive', onPress: doCancelSeries },
          ],
        );
      }
    } else {
      // Regular non-recurring cancel
      const warningMsg = late
        ? 'Cancelling less than 30 minutes before the visit will result in a negative rating. Are you sure?'
        : 'Are you sure you want to cancel this visit?';

      if (Platform.OS === 'web') {
        if (window.confirm(warningMsg)) doSingleCancel();
      } else {
        Alert.alert(
          'Cancel Visit?',
          warningMsg,
          [
            { text: 'Keep Visit', style: 'cancel' },
            { text: 'Cancel Visit', style: 'destructive', onPress: doSingleCancel },
          ],
        );
      }
    }
  }

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return '';
    try {
      // Handle both full datetime and time-only formats
      if (time.includes('T')) {
        return format(parseISO(time), 'h:mm a');
      }
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return time;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
          <Text style={styles.loadingText}>Loading visit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Visit not found</Text>
          <Button title="Go Back" variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const fullAddress = `${visit.elder.address}, ${visit.elder.city}, ${visit.elder.state} ${visit.elder.zip_code}`;

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
        <Text style={styles.headerTitle}>Visit Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Elder Info Card */}
        <Card variant="elevated" padding="lg" style={styles.elderCard}>
          <View style={styles.elderHeader}>
            <View style={styles.elderAvatar}>
              <PersonIcon size={48} color={roleColors.careseeker} />
            </View>
            <View style={styles.elderInfo}>
              <Text style={styles.elderName}>
                {visit.elder.first_name} {visit.elder.last_name}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
                <Badge
                  label={visit.status === 'scheduled' ? 'Scheduled' : visit.status === 'checked_in' ? 'In Progress' : visit.status}
                  variant={visit.status === 'scheduled' ? 'info' : visit.status === 'checked_in' ? 'warning' : 'neutral'}
                  size="md"
                />
                {(visit.is_recurring || visit.parent_visit_id) && (
                  <Badge label={'\uD83D\uDD01 Recurring'} variant="neutral" size="md" />
                )}
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <LocationIcon size={20} color={colors.text.secondary} />
            <Text style={styles.detailText}>{fullAddress}</Text>
          </View>

          <View style={styles.detailRow}>
            <ClockIcon size={20} color={colors.text.secondary} />
            <Text style={styles.detailText}>
              {formatTime(visit.scheduled_start)} - {formatTime(visit.scheduled_end)}
            </Text>
          </View>
        </Card>

        {/* Tasks Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks for this visit ({visit.tasks.length})</Text>
          <Card variant="default" padding="md">
            <View style={styles.tasksGrid}>
              {visit.tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskIconContainer}>
                    <TaskIcon category={task.category} size={36} />
                  </View>
                  <Text style={styles.taskName}>{task.name}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Card variant="outlined" padding="md">
            <Text style={styles.notesText}>
              {visit.special_instructions || 'No special notes for this visit.'}
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {visit.status === 'scheduled' && (
          <>
            <Button
              title="Start Visit"
              variant="success"
              size="caregiver"
              fullWidth
              onPress={() => router.push(`/(protected)/caregiver/visit/${id}/check-in`)}
            />
            <Pressable
              style={styles.cancelLink}
              onPress={handleCancelVisit}
              disabled={cancelling}
            >
              <Text style={styles.cancelLinkText}>
                {cancelling ? 'Cancelling...' : 'Cancel Visit'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
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
    gap: spacing[4],
  },
  loadingText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
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
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[24],
  },
  elderCard: {
    marginBottom: spacing[6],
    borderLeftWidth: 4,
    borderLeftColor: roleColors.careseeker,
  },
  elderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  elderAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: roleColors.careseeker + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  elderInfo: {
    flex: 1,
    gap: spacing[2],
  },
  elderName: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  detailText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontSize: 16,
    flex: 1,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  tasksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  taskItem: {
    width: '45%',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
  },
  taskIconContainer: {
    marginBottom: spacing[2],
  },
  taskName: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  notesText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  cancelLink: {
    marginTop: spacing[3],
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  cancelLinkText: {
    ...typography.styles.body,
    color: colors.error[500],
    fontWeight: '600',
  },
});
