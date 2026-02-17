// HealthGuide Family Visits List Screen
// Shows all visits for the family member's elder

import { useState, useEffect, useCallback } from 'react';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ClockIcon, CheckIcon } from '@/components/icons';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

interface Visit {
  id: string;
  scheduled_date: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  caregiver?: {
    first_name: string;
  };
  visit_tasks?: Array<{ status: string }>;
}

function formatVisitDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return { bg: colors.success[50], text: colors.success[800] };
    case 'in_progress':
    case 'checked_in':
      return { bg: colors.warning[50], text: colors.warning[800] };
    case 'scheduled':
      return { bg: colors.info[100], text: colors.info[800] };
    case 'missed':
      return { bg: colors.error[100], text: colors.error[800] };
    default:
      return { bg: colors.neutral[100], text: colors.text.primary };
  }
}

export default function FamilyVisitsScreen() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [])
  );

  async function loadVisits() {
    if (!user?.id) return;

    try {
      // Get family member's elder ID
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('elder_id')
        .eq('user_id', user.id)
        .eq('invite_status', 'accepted')
        .single();

      if (!familyMember) {
        setLoading(false);
        return;
      }

      // Get visits
      const { data: visitsData } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          actual_start,
          actual_end,
          status,
          caregiver:user_profiles!caregiver_id (first_name),
          visit_tasks (status)
        `)
        .eq('elder_id', familyMember.elder_id)
        .order('scheduled_date', { ascending: false })
        .limit(50);

      // Transform Supabase joins (arrays) to objects
      const transformed = (visitsData || []).map((v: any) => ({
        ...v,
        caregiver: Array.isArray(v.caregiver) ? v.caregiver[0] : v.caregiver,
      }));
      setVisits(transformed);
    } catch (error) {
      console.error('Error loading visits:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadVisits();
    setRefreshing(false);
  }

  function renderVisit({ item }: { item: Visit }) {
    const statusColor = getStatusColor(item.status);
    const tasksCompleted = item.visit_tasks?.filter((t) => t.status === 'completed').length || 0;
    const totalTasks = item.visit_tasks?.length || 0;

    return (
      <Card
        onPress={() => router.push(`/family/visit/${item.id}`)}
        style={styles.visitCard}
      >
        <View style={styles.visitHeader}>
          <Text style={styles.visitDate}>{formatVisitDate(item.scheduled_date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.caregiverName}>
          {item.caregiver?.first_name || 'Unassigned'}
        </Text>

        {item.actual_start && (
          <View style={styles.timeRow}>
            <ClockIcon size={14} color={colors.text.tertiary} />
            <Text style={styles.timeText}>
              {format(parseISO(item.actual_start), 'h:mm a')}
              {item.actual_end && ` - ${format(parseISO(item.actual_end), 'h:mm a')}`}
            </Text>
          </View>
        )}

        <View style={styles.taskRow}>
          <CheckIcon size={14} color={colors.success[500]} />
          <Text style={styles.taskText}>
            {tasksCompleted}/{totalTasks} tasks completed
          </Text>
        </View>
      </Card>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading visits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.titleText}>All Visits</Text>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisit}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            illustration="calendar"
            title="No visits yet"
            color={roleColors.family}
          />
        }
      />
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
    padding: layout.screenPadding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[2],
    marginRight: spacing[2],
  },
  backText: {
    ...typography.styles.body,
    color: roleColors.family,
  },
  titleText: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  list: {
    padding: layout.screenPadding,
  },
  visitCard: {
    marginBottom: layout.cardGap,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  visitDate: {
    ...typography.styles.label,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.styles.caption,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  caregiverName: {
    ...typography.styles.h4,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing[1],
  },
  timeText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
});
