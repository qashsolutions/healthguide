// HealthGuide Family Daily Reports List Screen
// Shows all daily reports for the family member's elder

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
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface DailyReport {
  id: string;
  report_date: string;
  visits: any[];
  total_tasks_completed: number;
  total_tasks_assigned: number;
  observations: any[];
  missed_visits: number;
}

function CalendarIcon({ size = 20, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} />
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

function UsersIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

function NoteIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export default function FamilyReportsScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  async function loadReports() {
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

      // Get reports
      const { data: reportsData } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('elder_id', familyMember.elder_id)
        .order('report_date', { ascending: false })
        .limit(30);

      setReports(reportsData || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }

  function renderReport({ item }: { item: DailyReport }) {
    const completionRate =
      item.total_tasks_assigned > 0
        ? Math.round((item.total_tasks_completed / item.total_tasks_assigned) * 100)
        : 0;

    const hasWarning = item.missed_visits > 0;

    return (
      <Pressable
        style={styles.reportCard}
        onPress={() => router.push(`/family/report/${item.id}`)}
      >
        <View style={styles.reportHeader}>
          <View style={styles.dateRow}>
            <CalendarIcon size={18} color="#3B82F6" />
            <Text style={styles.reportDate}>
              {format(parseISO(item.report_date), 'EEEE, MMMM d')}
            </Text>
          </View>
          {hasWarning && (
            <View style={styles.warningBadge}>
              <Text style={styles.warningText}>
                {item.missed_visits} missed
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <UsersIcon size={16} color="#6B7280" />
            <Text style={styles.statText}>
              {item.visits?.length || 0} visit{item.visits?.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.stat}>
            <CheckIcon size={16} color="#10B981" />
            <Text style={styles.statText}>{completionRate}% tasks</Text>
          </View>

          <View style={styles.stat}>
            <NoteIcon size={16} color="#6B7280" />
            <Text style={styles.statText}>
              {item.observations?.length || 0} note{item.observations?.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Completion bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionRate}%`,
                  backgroundColor: completionRate >= 80 ? '#10B981' : '#F59E0B',
                },
              ]}
            />
          </View>
        </View>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading reports...</Text>
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
        <Text style={styles.title}>Daily Reports</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No reports yet</Text>
            <Text style={styles.emptySubtext}>
              Daily reports will appear here after care visits
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
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...createShadow(1, 0.05, 4, 2),
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  warningBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#991B1B',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
