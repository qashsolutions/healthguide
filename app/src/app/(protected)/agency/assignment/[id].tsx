// HealthGuide Agency Visit Detail Screen
// Shows visit details for agency owner review

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  ClockIcon,
  CaregiverIcon,
  ElderIcon,
  LocationIcon,
  CheckIcon,
  NoteIcon,
  ArrowLeftIcon,
} from '@/components/icons';

interface VisitDetail {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  check_in_method: string | null;
  caregiver: { first_name: string; last_name: string } | null;
  elder: {
    first_name: string;
    last_name: string;
    address: string;
    city: string;
    state: string;
  } | null;
  tasks: { id: string; name: string; status: string }[];
}

export default function AgencyVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchVisit();
    }, [id])
  );

  async function fetchVisit() {
    if (!id) {
      setLoading(false);
      return;
    }

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
          notes,
          check_in_method,
          caregiver:user_profiles!caregiver_id (
            first_name,
            last_name
          ),
          elder:elders (
            first_name,
            last_name,
            address,
            city,
            state
          ),
          visit_tasks (
            id,
            status,
            task:task_library ( name )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const cg = Array.isArray(data.caregiver) ? data.caregiver[0] : data.caregiver;
        const el = Array.isArray(data.elder) ? data.elder[0] : data.elder;
        const tasks = Array.isArray(data.visit_tasks)
          ? data.visit_tasks.map((vt: any) => ({
              id: vt.id,
              name: vt.task?.name || 'Task',
              status: vt.status || 'pending',
            }))
          : [];

        setVisit({
          ...data,
          caregiver: cg || null,
          elder: el || null,
          tasks,
        } as VisitDetail);
      }
    } catch (error) {
      console.error('Error fetching visit:', error);
    }

    setLoading(false);
  }

  function formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', variant: 'success' as const };
      case 'in_progress':
        return { label: 'In Progress', variant: 'warning' as const };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'error' as const };
      case 'missed':
        return { label: 'Missed', variant: 'error' as const };
      default:
        return { label: 'Scheduled', variant: 'neutral' as const };
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <ArrowLeftIcon size={20} color={roleColors.agency_owner} />
        <Text style={styles.backText}>Schedule</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Visit Details</Text>
      <View style={{ width: 80 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={roleColors.agency_owner} />
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Visit not found</Text>
          <Button title="Go Back" variant="primary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const statusBadge = getStatusBadge(visit.status);
  const elderName = visit.elder
    ? `${visit.elder.first_name} ${visit.elder.last_name}`
    : 'Unknown Elder';
  const caregiverName = visit.caregiver
    ? `${visit.caregiver.first_name} ${visit.caregiver.last_name}`
    : 'Unassigned';
  const elderAddress = visit.elder
    ? [visit.elder.address, visit.elder.city, visit.elder.state].filter(Boolean).join(', ')
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <Badge label={statusBadge.label} variant={statusBadge.variant} size="md" />
          <Text style={styles.dateText}>{formatDate(visit.scheduled_date)}</Text>
        </View>

        {/* Time Card */}
        <Card variant="default" padding="lg" style={styles.card}>
          <View style={styles.cardTitle}>
            <ClockIcon size={20} color={roleColors.agency_owner} />
            <Text style={styles.cardTitleText}>Schedule</Text>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Scheduled</Text>
            <Text style={styles.timeValue}>
              {formatTime(visit.scheduled_start)} - {formatTime(visit.scheduled_end)}
            </Text>
          </View>
          {visit.actual_start && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Actual Check-in</Text>
              <Text style={styles.timeValue}>
                {format(new Date(visit.actual_start), 'h:mm a')}
              </Text>
            </View>
          )}
          {visit.actual_end && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Actual Check-out</Text>
              <Text style={styles.timeValue}>
                {format(new Date(visit.actual_end), 'h:mm a')}
              </Text>
            </View>
          )}
          {visit.check_in_method && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Check-in Method</Text>
              <Text style={styles.timeValue}>{visit.check_in_method.toUpperCase()}</Text>
            </View>
          )}
        </Card>

        {/* People Card */}
        <Card variant="default" padding="lg" style={styles.card}>
          <View style={styles.personSection}>
            <View style={styles.personRow}>
              <View style={[styles.personAvatar, { backgroundColor: roleColors.caregiver + '20' }]}>
                <CaregiverIcon size={24} color={roleColors.caregiver} />
              </View>
              <View>
                <Text style={styles.personLabel}>Caregiver</Text>
                <Text style={styles.personName}>{caregiverName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.personSection}>
            <View style={styles.personRow}>
              <View style={[styles.personAvatar, { backgroundColor: roleColors.careseeker + '20' }]}>
                <ElderIcon size={24} color={roleColors.careseeker} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.personLabel}>Elder</Text>
                <Text style={styles.personName}>{elderName}</Text>
                {elderAddress ? (
                  <View style={styles.addressRow}>
                    <LocationIcon size={14} color={colors.text.tertiary} />
                    <Text style={styles.addressText}>{elderAddress}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Tasks Card */}
        {visit.tasks.length > 0 && (
          <Card variant="default" padding="lg" style={styles.card}>
            <View style={styles.cardTitle}>
              <CheckIcon size={20} color={roleColors.agency_owner} />
              <Text style={styles.cardTitleText}>
                Tasks ({visit.tasks.filter((t) => t.status === 'completed').length}/{visit.tasks.length})
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
                          : colors.neutral[300],
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.taskName,
                    task.status === 'completed' && styles.taskCompleted,
                  ]}
                >
                  {task.name}
                </Text>
                {task.status === 'completed' && (
                  <CheckIcon size={16} color={colors.success[500]} />
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Notes Card */}
        {visit.notes && (
          <Card variant="default" padding="lg" style={styles.card}>
            <View style={styles.cardTitle}>
              <NoteIcon size={20} color={roleColors.agency_owner} />
              <Text style={styles.cardTitleText}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{visit.notes}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    width: 80,
  },
  backText: {
    ...typography.styles.body,
    color: roleColors.agency_owner,
  },
  headerTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  errorText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  statusHeader: {
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  dateText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  card: {
    marginBottom: spacing[3],
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  cardTitleText: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
  },
  timeLabel: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  timeValue: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  personSection: {
    paddingVertical: spacing[2],
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personLabel: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  personName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing[0.5],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  addressText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[1],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1.5],
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
  notesText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
