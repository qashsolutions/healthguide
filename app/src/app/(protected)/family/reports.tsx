// HealthGuide Family Daily Reports List Screen
// Shows all daily reports for the family member's elder

import { useState, useCallback } from 'react';
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
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon, CheckIcon, NoteIcon, UsersIcon } from '@/components/icons';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

interface DailyReport {
  id: string;
  report_date: string;
  visits: any[];
  total_tasks_completed: number;
  total_tasks_assigned: number;
  observations: any[];
  missed_visits: number;
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
      <Card
        onPress={() => router.push(`/family/report/${item.id}`)}
        style={styles.reportCard}
      >
        <View style={styles.reportHeader}>
          <View style={styles.dateRow}>
            <CalendarIcon size={18} color={roleColors.family} />
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
            <UsersIcon size={16} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {item.visits?.length || 0} visit{item.visits?.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.stat}>
            <CheckIcon size={16} color={colors.success[500]} />
            <Text style={styles.statText}>{completionRate}% tasks</Text>
          </View>

          <View style={styles.stat}>
            <NoteIcon size={16} color={colors.text.tertiary} />
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
                  backgroundColor: completionRate >= 80 ? colors.success[500] : colors.warning[500],
                },
              ]}
            />
          </View>
        </View>
      </Card>
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
          <EmptyState
            illustration="clipboard"
            title="No reports yet"
            subtitle="Daily reports will appear here after care visits"
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
  title: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: layout.screenPadding,
  },
  reportCard: {
    marginBottom: layout.cardGap,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  reportDate: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  warningBadge: {
    backgroundColor: colors.error[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  warningText: {
    ...typography.styles.caption,
    fontWeight: '500',
    color: colors.error[800],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  statText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  progressContainer: {
    marginTop: spacing[1],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
});
