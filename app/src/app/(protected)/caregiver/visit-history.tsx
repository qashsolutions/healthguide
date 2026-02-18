// HealthGuide Caregiver Visit History
// Paginated list of past visits grouped by date

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CheckIcon, ClockIcon, PersonIcon, FileTextIcon } from '@/components/icons';

interface Visit {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
  elder_name: string;
  task_summary: string;
  task_count: number;
}

interface GroupedVisits {
  date: string;
  label: string;
  visits: Visit[];
}

const PAGE_SIZE = 20;

export default function VisitHistoryScreen() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadVisits(0, true);
    }, [])
  );

  async function loadVisits(pageNum: number, reset = false) {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_start,
          scheduled_end,
          status,
          actual_start,
          actual_end,
          elder:elders(first_name, last_name),
          visit_tasks(id, task:task_library(name))
        `)
        .eq('caregiver_id', user.id)
        .in('status', ['completed', 'missed', 'checked_out'])
        .order('scheduled_date', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const formatted: Visit[] = (data || []).map((v: any) => ({
        id: v.id,
        scheduled_date: v.scheduled_date,
        scheduled_start: v.scheduled_start,
        scheduled_end: v.scheduled_end,
        status: v.status,
        actual_start: v.actual_start,
        actual_end: v.actual_end,
        elder_name: v.elder ? `${v.elder.first_name || ''} ${v.elder.last_name || ''}`.trim() || 'Unknown Elder' : 'Unknown Elder',
        task_summary: Array.isArray(v.visit_tasks)
          ? v.visit_tasks.map((t: any) => t.task?.name).filter(Boolean).slice(0, 3).join(', ')
          : '',
        task_count: Array.isArray(v.visit_tasks) ? v.visit_tasks.length : 0,
      }));

      if (reset) {
        setVisits(formatted);
      } else {
        setVisits((prev) => [...prev, ...formatted]);
      }
      setHasMore(formatted.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching visit history:', error);
      // Use mock data if DB unavailable
      if (reset) {
        setVisits(getMockVisits());
        setHasMore(false);
      }
    }

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }

  function getMockVisits(): Visit[] {
    const today = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i - 1);
      return {
        id: String(i + 1),
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_start: '09:00',
        scheduled_end: '11:00',
        status: i === 3 ? 'missed' : 'completed',
        actual_start: i === 3 ? null : date.toISOString(),
        actual_end: i === 3 ? null : date.toISOString(),
        elder_name: ['Margaret Johnson', 'Robert Williams', 'Dorothy Smith', 'James Brown'][i % 4],
        task_summary: ['Medication, Personal Care, Vitals', 'Companionship, Meal Prep', 'Mobility, Exercise', 'Personal Care, Housekeeping'][i % 4],
        task_count: [3, 2, 2, 2][i % 4],
      };
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadVisits(0, true);
  }

  async function onLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadVisits(page + 1);
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

  function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function getDuration(start: string | null, end: string | null): string {
    if (!start || !end) return '--';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // Group visits by date
  const grouped: GroupedVisits[] = visits.reduce<GroupedVisits[]>((acc, visit) => {
    const existing = acc.find((g) => g.date === visit.scheduled_date);
    if (existing) {
      existing.visits.push(visit);
    } else {
      acc.push({
        date: visit.scheduled_date,
        label: formatDateLabel(visit.scheduled_date),
        visits: [visit],
      });
    }
    return acc;
  }, []);

  const renderVisit = (visit: Visit) => (
    <Card key={visit.id} variant="default" padding="md" style={styles.visitCard}>
      <View style={styles.visitHeader}>
        <View style={styles.elderInfo}>
          <PersonIcon size={20} color={roleColors.caregiver} />
          <Text style={styles.elderName}>{visit.elder_name}</Text>
        </View>
        <Badge
          label={visit.status === 'missed' ? 'Missed' : 'Completed'}
          variant={visit.status === 'missed' ? 'error' : 'success'}
          size="sm"
        />
      </View>
      <View style={styles.visitDetails}>
        <View style={styles.detailRow}>
          <ClockIcon size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            {visit.scheduled_start} - {visit.scheduled_end}
          </Text>
          {visit.status !== 'missed' && (
            <Text style={styles.duration}>
              ({getDuration(visit.actual_start, visit.actual_end)})
            </Text>
          )}
        </View>
        {visit.task_summary ? (
          <View style={styles.detailRow}>
            <CheckIcon size={14} color={colors.text.secondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {visit.task_summary}
              {visit.task_count > 3 ? ` +${visit.task_count - 3} more` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  const renderGroup = ({ item }: { item: GroupedVisits }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateLabel}>{item.label}</Text>
      {item.visits.map(renderVisit)}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Visit History', headerBackTitle: 'Back' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Visit History', headerBackTitle: 'Back' }} />
      <FlatList
        data={grouped}
        renderItem={renderGroup}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={roleColors.caregiver}
              style={styles.loadingMore}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <View style={styles.emptyIcon}><FileTextIcon size={48} color={colors.neutral[300]} /></View>
            <Text style={styles.emptyText}>No visit history yet</Text>
            <Text style={styles.emptySubtext}>
              Completed and missed visits will appear here
            </Text>
          </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  dateGroup: {
    marginBottom: spacing[4],
  },
  dateLabel: {
    ...typography.styles.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  visitCard: {
    marginBottom: spacing[2],
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  elderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  elderName: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  visitDetails: {
    gap: spacing[1],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  detailText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  duration: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  loadingMore: {
    paddingVertical: spacing[4],
  },
  emptyIcon: {
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
});
