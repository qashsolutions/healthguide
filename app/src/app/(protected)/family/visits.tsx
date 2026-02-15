// HealthGuide Family Visits List Screen
// Shows all visits for the family member's elder

import { useState, useEffect, useCallback } from 'react';
import { createShadow } from '@/theme/spacing';
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
import Svg, { Path, Circle } from 'react-native-svg';

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

function ClockIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m20 6-11 11-5-5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
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
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'in_progress':
    case 'checked_in':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'scheduled':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'missed':
      return { bg: '#FEE2E2', text: '#991B1B' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
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
      <Pressable
        style={styles.visitCard}
        onPress={() => router.push(`/family/visit/${item.id}`)}
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
            <ClockIcon size={14} color="#6B7280" />
            <Text style={styles.timeText}>
              {format(parseISO(item.actual_start), 'h:mm a')}
              {item.actual_end && ` - ${format(parseISO(item.actual_end), 'h:mm a')}`}
            </Text>
          </View>
        )}

        <View style={styles.taskRow}>
          <CheckIcon size={14} color="#10B981" />
          <Text style={styles.taskText}>
            {tasksCompleted}/{totalTasks} tasks completed
          </Text>
        </View>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading visits...</Text>
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
        <Text style={styles.title}>All Visits</Text>
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No visits yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...createShadow(1, 0.05, 4, 2),
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  caregiverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
