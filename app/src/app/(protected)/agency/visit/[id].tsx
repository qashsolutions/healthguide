// HealthGuide Agency Visit Detail
// Read-only detail view for agency owner to review a visit

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui/Badge';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  ArrowLeftIcon,
  ClockIcon,
  PersonIcon,
  LocationIcon,
  CheckIcon,
  NoteIcon,
} from '@/components/icons';

interface VisitDetail {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  check_in_method: string | null;
  notes: string | null;
  caregiver: { first_name: string; last_name: string } | null;
  elder: {
    first_name: string;
    last_name: string;
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
  tasks: { id: string; name: string; status: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  checked_in: { label: 'Checked In', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  checked_out: { label: 'Checked Out', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  missed: { label: 'Missed', variant: 'error' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

export default function AgencyVisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState<VisitDetail | null>(null);

  const fetchVisit = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          status,
          scheduled_date,
          scheduled_start,
          scheduled_end,
          actual_start,
          actual_end,
          check_in_method,
          notes,
          caregiver:user_profiles!caregiver_id (first_name, last_name),
          elder:elders (first_name, last_name, address, city, state),
          visit_tasks (
            id,
            status,
            task:task_library (name)
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching visit:', error);
        setLoading(false);
        return;
      }

      const caregiver = Array.isArray(data.caregiver) ? data.caregiver[0] : data.caregiver;
      const elder = Array.isArray(data.elder) ? data.elder[0] : data.elder;
      const tasks = Array.isArray(data.visit_tasks)
        ? data.visit_tasks.map((vt: any) => {
            const taskDef = Array.isArray(vt.task) ? vt.task[0] : vt.task;
            return {
              id: vt.id,
              name: taskDef?.name || 'Task',
              status: vt.status || 'pending',
            };
          })
        : [];

      setVisit({
        id: data.id,
        status: data.status,
        scheduled_date: data.scheduled_date,
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
        actual_start: data.actual_start,
        actual_end: data.actual_end,
        check_in_method: data.check_in_method,
        notes: data.notes,
        caregiver,
        elder,
        tasks,
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVisit();
  }, [fetchVisit]);

  const formatTime = (time: string) => {
    if (!time) return '';
    try {
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

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.agency_owner} />
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeftIcon size={20} color={roleColors.agency_owner} />
          </Pressable>
          <Text style={styles.headerTitle}>Visit Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.scheduled;
  const caregiverName = visit.caregiver
    ? `${visit.caregiver.first_name} ${visit.caregiver.last_name}`.trim()
    : 'Unassigned';
  const elderName = visit.elder
    ? `${visit.elder.first_name} ${visit.elder.last_name}`.trim()
    : 'Unknown';
  const elderAddress = visit.elder
    ? [visit.elder.address, visit.elder.city, visit.elder.state].filter(Boolean).join(', ')
    : '';
  const completedTasks = visit.tasks.filter((t) => t.status === 'completed').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={roleColors.agency_owner} />
        </Pressable>
        <Text style={styles.headerTitle}>Visit Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status & Date */}
        <Card variant="outlined" padding="md" style={styles.section}>
          <View style={styles.statusRow}>
            <Badge label={statusCfg.label} variant={statusCfg.variant} size="md" />
            {visit.check_in_method && (
              <Text style={styles.evvLabel}>EVV: {visit.check_in_method.toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.dateText}>{formatDate(visit.scheduled_date)}</Text>
          <View style={styles.timeRow}>
            <ClockIcon size={16} color={colors.text.secondary} />
            <Text style={styles.timeText}>
              {formatTime(visit.scheduled_start)} – {formatTime(visit.scheduled_end)}
            </Text>
          </View>
          {visit.actual_start && (
            <View style={styles.actualTimeRow}>
              <Text style={styles.actualLabel}>Actual:</Text>
              <Text style={styles.actualTime}>
                {formatTime(visit.actual_start)}
                {visit.actual_end ? ` – ${formatTime(visit.actual_end)}` : ' (ongoing)'}
              </Text>
            </View>
          )}
        </Card>

        {/* People */}
        <Card variant="outlined" padding="md" style={styles.section}>
          <View style={styles.personRow}>
            <View style={[styles.personAvatar, { backgroundColor: roleColors.caregiver + '20' }]}>
              <PersonIcon size={20} color={roleColors.caregiver} />
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personLabel}>Caregiver</Text>
              <Text style={styles.personName}>{caregiverName}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.personRow}>
            <View style={[styles.personAvatar, { backgroundColor: roleColors.careseeker + '20' }]}>
              <PersonIcon size={20} color={roleColors.careseeker} />
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personLabel}>Elder</Text>
              <Text style={styles.personName}>{elderName}</Text>
              {elderAddress ? (
                <View style={styles.addressRow}>
                  <LocationIcon size={12} color={colors.text.tertiary} />
                  <Text style={styles.addressText}>{elderAddress}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Tasks */}
        {visit.tasks.length > 0 && (
          <Card variant="outlined" padding="md" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tasks</Text>
              <Text style={styles.taskCount}>
                {completedTasks}/{visit.tasks.length}
              </Text>
            </View>
            {visit.tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View
                  style={[
                    styles.taskDot,
                    {
                      backgroundColor:
                        task.status === 'completed'
                          ? colors.success[500]
                          : task.status === 'skipped'
                            ? colors.warning[500]
                            : colors.neutral[300],
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.taskName,
                    task.status === 'completed' && styles.taskCompleted,
                    task.status === 'skipped' && styles.taskSkipped,
                  ]}
                  numberOfLines={1}
                >
                  {task.name}
                </Text>
                {task.status === 'completed' && <CheckIcon size={16} color={colors.success[500]} />}
              </View>
            ))}
          </Card>
        )}

        {/* Notes */}
        {visit.notes ? (
          <Card variant="outlined" padding="md" style={styles.section}>
            <View style={styles.sectionHeader}>
              <NoteIcon size={18} color={colors.text.secondary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{visit.notes}</Text>
          </Card>
        ) : null}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: roleColors.agency_owner + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing[3],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  evvLabel: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  dateText: {
    ...typography.styles.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  timeText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  actualTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  actualLabel: {
    ...typography.styles.caption,
    color: colors.success[600],
    fontWeight: '600',
  },
  actualTime: {
    ...typography.styles.body,
    color: colors.success[700],
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
  },
  personLabel: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  personName: {
    ...typography.styles.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing[1],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[0.5],
  },
  addressText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    flex: 1,
  },
  taskCount: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[50],
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskName: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  taskCompleted: {
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  taskSkipped: {
    color: colors.warning[600],
    fontStyle: 'italic',
  },
  notesText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
