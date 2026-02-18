// HealthGuide Family Dashboard Screen
// Overview of elder care with recent visits and notifications

import { useState, useEffect, useCallback } from 'react';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows, layout } from '@/theme/spacing';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  registerForPushNotifications,
  registerNotificationCategories,
  setupNotificationResponseHandler,
  clearBadge,
} from '@/lib/notifications';
import { FileTextIcon, CalendarIcon, SettingsIcon } from '@/components/icons';

interface ElderInfo {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
}

interface RecentVisit {
  id: string;
  scheduled_date: string;
  actual_start: string;
  actual_end: string;
  status: string;
  caregiver: {
    first_name: string;
  };
  tasks_completed: number;
  tasks_total: number;
}

export default function FamilyDashboardScreen() {
  const { user } = useAuth();
  const [elder, setElder] = useState<ElderInfo | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [todayVisit, setTodayVisit] = useState<RecentVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Register for push notifications
    if (user?.id) {
      registerForPushNotifications(user.id, 'family');
      registerNotificationCategories();
    }

    // Setup notification tap handler
    const unsubscribe = setupNotificationResponseHandler((screen, params) => {
      if (screen === 'FamilyVisitDetail' && params?.visitId) {
        router.push(`/family/visit/${params.visitId}`);
      } else if (screen === 'FamilyReportDetail' && params?.reportId) {
        router.push(`/family/report/${params.reportId}`);
      }
    });

    return unsubscribe;
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      clearBadge();
    }, [])
  );

  async function loadData() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get family member's elder
      const { data: familyMember } = await supabase
        .from('family_members')
        .select(`
          elder_id,
          elder:elders (
            id,
            first_name,
            last_name,
            address
          )
        `)
        .eq('user_id', user.id)
        .eq('invite_status', 'accepted')
        .single();

      if (familyMember?.elder) {
        // Transform Supabase join (array) to object
        const elderData = Array.isArray(familyMember.elder) ? familyMember.elder[0] : familyMember.elder;
        setElder(elderData);

        // Get recent visits
        const { data: visits } = await supabase
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
          .eq('elder_id', elderData.id)
          .in('status', ['completed', 'in_progress'])
          .order('scheduled_date', { ascending: false })
          .limit(5);

        if (visits) {
          const formattedVisits = visits.map((v: any) => ({
            ...v,
            tasks_completed: v.visit_tasks?.filter((t: any) => t.status === 'completed').length || 0,
            tasks_total: v.visit_tasks?.length || 0,
          }));

          // Check for today's visit
          const today = formattedVisits.find((v) =>
            isToday(new Date(v.scheduled_date))
          );
          setTodayVisit(today || null);
          setRecentVisits(formattedVisits.filter((v) => v.id !== today?.id));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function formatVisitDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <GradientHeader roleColor={roleColors.family} opacity={0.14}>
          <Text style={styles.greeting}>Caring for</Text>
          <Text style={styles.elderName}>
            {elder?.first_name} {elder?.last_name}
          </Text>
        </GradientHeader>

        {/* Today's Visit Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Care</Text>

          {todayVisit ? (
            <Card
              onPress={() => router.push(`/family/visit/${todayVisit.id}`)}
              tintColor={roleColors.family}
              padding="lg"
            >
              <View style={styles.todayStatus}>
                {todayVisit.status === 'in_progress' ? (
                  <>
                    <View style={[styles.statusDot, styles.inProgress]} />
                    <Text style={styles.statusText}>Visit in Progress</Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.statusDot, styles.completed]} />
                    <Text style={styles.statusText}>Visit Completed</Text>
                  </>
                )}
              </View>

              <Text style={styles.caregiverName}>
                {todayVisit.caregiver?.first_name}
              </Text>

              {todayVisit.actual_start && (
                <Text style={styles.visitTime}>
                  {format(new Date(todayVisit.actual_start), 'h:mm a')}
                  {todayVisit.actual_end &&
                    ` - ${format(new Date(todayVisit.actual_end), 'h:mm a')}`}
                </Text>
              )}

              <View style={styles.taskProgress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          todayVisit.tasks_total > 0
                            ? (todayVisit.tasks_completed / todayVisit.tasks_total) * 100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.taskCount}>
                  {todayVisit.tasks_completed}/{todayVisit.tasks_total} tasks
                </Text>
              </View>
            </Card>
          ) : (
            <EmptyState
              illustration="calendar"
              title="No visit scheduled today"
              color={roleColors.family}
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Card
            onPress={() => router.push('/family/reports')}
            style={styles.actionCard}
          >
            <View style={styles.actionIconWrap}>
              <FileTextIcon size={28} color={roleColors.family} />
            </View>
            <Text style={styles.actionLabel}>Reports</Text>
          </Card>

          <Card
            onPress={() => router.push('/family/visits')}
            style={styles.actionCard}
          >
            <View style={styles.actionIconWrap}>
              <CalendarIcon size={28} color={roleColors.family} />
            </View>
            <Text style={styles.actionLabel}>All Visits</Text>
          </Card>

          <Card
            onPress={() => router.push('/family/settings')}
            style={styles.actionCard}
          >
            <View style={styles.actionIconWrap}>
              <SettingsIcon size={28} color={roleColors.family} />
            </View>
            <Text style={styles.actionLabel}>Settings</Text>
          </Card>
        </View>

        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Visits</Text>

            {recentVisits.map((visit) => (
              <Card
                key={visit.id}
                onPress={() => router.push(`/family/visit/${visit.id}`)}
                style={styles.visitCard}
              >
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>
                    {formatVisitDate(visit.scheduled_date)}
                  </Text>
                  <Text style={styles.visitCaregiver}>
                    {visit.caregiver?.first_name}
                  </Text>
                </View>

                <View style={styles.visitStats}>
                  <Text style={styles.visitStat}>
                    ✓ {visit.tasks_completed}/{visit.tasks_total} tasks
                  </Text>
                  {visit.actual_start && visit.actual_end && (
                    <Text style={styles.visitStat}>
                      {format(new Date(visit.actual_start), 'h:mm a')} -{' '}
                      {format(new Date(visit.actual_end), 'h:mm a')}
                    </Text>
                  )}
                </View>
              </Card>
            ))}

            <Pressable
              style={styles.viewAllButton}
              onPress={() => router.push('/family/visits')}
            >
              <Text style={styles.viewAllText}>View All Visits →</Text>
            </Pressable>
          </View>
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
  scroll: {
    flex: 1,
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
  greeting: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  elderName: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  section: {
    padding: layout.screenPadding,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: layout.cardGap,
  },
  todayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[2],
  },
  inProgress: {
    backgroundColor: colors.success[500],
  },
  completed: {
    backgroundColor: roleColors.family,
  },
  statusText: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  caregiverName: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  visitTime: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginBottom: spacing[4],
  },
  taskProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    marginRight: spacing[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success[500],
    borderRadius: borderRadius.full,
  },
  taskCount: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    minWidth: 80,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPadding,
    gap: layout.cardGap,
    marginBottom: spacing[2],
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: roleColors.family + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  actionLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  visitCard: {
    marginBottom: spacing[2],
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  visitDate: {
    ...typography.styles.label,
    fontWeight: '600',
    color: colors.text.primary,
  },
  visitCaregiver: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  visitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitStat: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  viewAllText: {
    ...typography.styles.label,
    color: roleColors.family,
  },
});
