// HealthGuide Family Visit Detail Screen
// Detailed view of a specific visit for family members

import { useState, useEffect } from 'react';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows, layout } from '@/theme/spacing';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { ArrowLeftIcon, CheckIcon, ClockIcon, XIcon, MapPinIcon, PhoneIcon } from '@/components/icons';
import { Card } from '@/components/ui/Card';
import Svg, { Circle, Path } from 'react-native-svg';

interface VisitDetail {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  notes: string | null;
  caregiver: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  elder: {
    first_name: string;
    last_name: string;
    address: string;
  };
  tasks: VisitTask[];
  check_in_location: {
    latitude: number;
    longitude: number;
  } | null;
}

interface VisitTask {
  id: string;
  task_name: string;
  status: 'pending' | 'completed' | 'skipped';
  completed_at: string | null;
  skip_reason: string | null;
  notes: string | null;
}

function CheckCircleIcon({ size = 20, color = '#10B981' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XCircleIcon({ size = 20, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function FamilyVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, [id]);

  async function loadVisit() {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_start,
          scheduled_end,
          actual_start,
          actual_end,
          status,
          notes,
          check_in_location,
          caregiver:user_profiles!caregiver_id (
            first_name,
            last_name,
            phone
          ),
          elder:elders!elder_id (
            first_name,
            last_name,
            address
          ),
          visit_tasks (
            id,
            task_name,
            status,
            completed_at,
            skip_reason,
            notes
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform Supabase joins (arrays) to objects
      const transformed = {
        ...data,
        caregiver: Array.isArray(data.caregiver) ? data.caregiver[0] : data.caregiver,
        elder: Array.isArray(data.elder) ? data.elder[0] : data.elder,
        tasks: data.visit_tasks || [],
      };
      setVisit(transformed as VisitDetail);
    } catch (error) {
      console.error('Error loading visit:', error);
    }

    setLoading(false);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  }

  function getStatusConfig(status: string) {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: colors.success[500], bgColor: colors.success[50] };
      case 'in_progress':
        return { label: 'In Progress', color: roleColors.family, bgColor: colors.info[50] };
      case 'scheduled':
        return { label: 'Scheduled', color: colors.text.tertiary, bgColor: colors.neutral[100] };
      case 'missed':
        return { label: 'Missed', color: colors.error[500], bgColor: colors.error[50] };
      default:
        return { label: status, color: colors.text.tertiary, bgColor: colors.neutral[100] };
    }
  }

  function getTaskIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color={colors.success[500]} />;
      case 'skipped':
        return <XCircleIcon color={colors.warning[500]} />;
      default:
        return <ClockIcon color={colors.neutral[400]} />;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={roleColors.family} />
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeftIcon color={colors.text.primary} />
          </Pressable>
          <Text style={styles.titleText}>Visit Not Found</Text>
        </View>
        <View style={styles.loading}>
          <Text style={styles.errorText}>This visit could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(visit.status);
  const completedTasks = visit.tasks.filter((t) => t.status === 'completed').length;
  const skippedTasks = visit.tasks.filter((t) => t.status === 'skipped').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeftIcon color={colors.text.primary} />
        </Pressable>
        <Text style={styles.titleText}>Visit Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll}>
        {/* Date and Status */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatDate(visit.scheduled_date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Caregiver Card */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardTitle}>Caregiver</Text>
          <View style={styles.caregiverInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {visit.caregiver.first_name[0]}{visit.caregiver.last_name[0]}
              </Text>
            </View>
            <View style={styles.caregiverDetails}>
              <Text style={styles.caregiverName}>
                {visit.caregiver.first_name} {visit.caregiver.last_name}
              </Text>
              {visit.caregiver.phone && (
                <View style={styles.phoneRow}>
                  <PhoneIcon size={16} color={colors.success[500]} />
                  <Text style={styles.phoneText}>{visit.caregiver.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Time Card */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardTitle}>Visit Time</Text>

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Scheduled</Text>
            <Text style={styles.timeValue}>
              {format(new Date(`2000-01-01T${visit.scheduled_start}`), 'h:mm a')} -{' '}
              {format(new Date(`2000-01-01T${visit.scheduled_end}`), 'h:mm a')}
            </Text>
          </View>

          {visit.actual_start && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Check-in</Text>
              <Text style={[styles.timeValue, styles.actualTime]}>
                {format(new Date(visit.actual_start), 'h:mm a')}
              </Text>
            </View>
          )}

          {visit.actual_end && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Check-out</Text>
              <Text style={[styles.timeValue, styles.actualTime]}>
                {format(new Date(visit.actual_end), 'h:mm a')}
              </Text>
            </View>
          )}

          {visit.check_in_location && (
            <View style={styles.locationRow}>
              <MapPinIcon size={16} color={roleColors.family} />
              <Text style={styles.locationText}>Location verified at check-in</Text>
            </View>
          )}
        </Card>

        {/* Tasks Card */}
        <Card style={styles.cardSpacing}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tasks</Text>
            <Text style={styles.taskSummary}>
              {completedTasks}/{visit.tasks.length} completed
              {skippedTasks > 0 && ` • ${skippedTasks} skipped`}
            </Text>
          </View>

          {visit.tasks.length > 0 ? (
            <View style={styles.taskList}>
              {visit.tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskIcon}>{getTaskIcon(task.status)}</View>
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskName,
                        task.status === 'completed' && styles.taskCompleted,
                        task.status === 'skipped' && styles.taskSkipped,
                      ]}
                    >
                      {task.task_name}
                    </Text>
                    {task.status === 'completed' && task.completed_at && (
                      <Text style={styles.taskTime}>
                        Completed at {format(new Date(task.completed_at), 'h:mm a')}
                      </Text>
                    )}
                    {task.status === 'skipped' && task.skip_reason && (
                      <Text style={styles.taskReason}>
                        Skipped: {task.skip_reason}
                      </Text>
                    )}
                    {task.notes && (
                      <Text style={styles.taskNotes}>{task.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noTasks}>No tasks assigned for this visit</Text>
          )}
        </Card>

        {/* Notes Card */}
        {visit.notes && (
          <Card style={styles.cardSpacing}>
            <Text style={styles.cardTitle}>Visit Notes</Text>
            <Text style={styles.notesText}>{visit.notes}</Text>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[2],
  },
  titleText: {
    ...typography.styles.h4,
    fontSize: 18,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  dateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: layout.screenPadding,
  },
  dateText: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
  },
  statusLabel: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
  },
  cardSpacing: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.cardGap,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  cardTitle: {
    ...typography.styles.label,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: roleColors.family,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  avatarText: {
    ...typography.styles.h4,
    color: colors.white,
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    ...typography.styles.h4,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    ...typography.styles.bodySmall,
    color: colors.success[500],
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  timeLabel: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  timeValue: {
    ...typography.styles.bodySmall,
    fontWeight: '500',
    color: colors.text.primary,
  },
  actualTime: {
    color: colors.success[500],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  locationText: {
    ...typography.styles.bodySmall,
    color: roleColors.family,
  },
  taskSummary: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  taskList: {
    gap: spacing[2],
  },
  taskItem: {
    flexDirection: 'row',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  taskIcon: {
    marginRight: spacing[3],
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    ...typography.styles.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  taskCompleted: {
    color: colors.success[500],
  },
  taskSkipped: {
    color: colors.warning[500],
  },
  taskTime: {
    ...typography.styles.caption,
    fontSize: 13,
    color: colors.neutral[400],
    marginTop: 2,
  },
  taskReason: {
    ...typography.styles.caption,
    fontSize: 13,
    color: colors.warning[500],
    marginTop: 2,
    fontStyle: 'italic',
  },
  taskNotes: {
    ...typography.styles.caption,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
  noTasks: {
    ...typography.styles.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  notesText: {
    ...typography.styles.body,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bottomPadding: {
    height: layout.sectionGap,
  },
});
