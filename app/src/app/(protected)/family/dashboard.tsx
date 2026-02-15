// HealthGuide Family Dashboard Screen
// Overview of elder care with recent visits and notifications

import { useState, useEffect, useCallback } from 'react';
import { createShadow } from '@/theme/spacing';
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
import {
  registerForPushNotifications,
  registerNotificationCategories,
  setupNotificationResponseHandler,
  clearBadge,
} from '@/lib/notifications';

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
    if (!user?.id) return;

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
        <View style={styles.header}>
          <Text style={styles.greeting}>Caring for</Text>
          <Text style={styles.elderName}>
            {elder?.first_name} {elder?.last_name}
          </Text>
        </View>

        {/* Today's Visit Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Care</Text>

          {todayVisit ? (
            <Pressable
              style={styles.todayCard}
              onPress={() => router.push(`/family/visit/${todayVisit.id}`)}
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
            </Pressable>
          ) : (
            <View style={styles.noVisitCard}>
              <Text style={styles.noVisitEmoji}>📅</Text>
              <Text style={styles.noVisitText}>No visit scheduled today</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/family/reports')}
          >
            <Text style={styles.actionEmoji}>📋</Text>
            <Text style={styles.actionLabel}>Reports</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/family/visits')}
          >
            <Text style={styles.actionEmoji}>📆</Text>
            <Text style={styles.actionLabel}>All Visits</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/family/settings')}
          >
            <Text style={styles.actionEmoji}>⚙️</Text>
            <Text style={styles.actionLabel}>Settings</Text>
          </Pressable>
        </View>

        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Visits</Text>

            {recentVisits.map((visit) => (
              <Pressable
                key={visit.id}
                style={styles.visitCard}
                onPress={() => router.push(`/family/visit/${visit.id}`)}
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
              </Pressable>
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
    backgroundColor: '#F5F5F5',
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
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  elderName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...createShadow(2, 0.05, 8, 2),
  },
  todayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  inProgress: {
    backgroundColor: '#10B981',
  },
  completed: {
    backgroundColor: '#3B82F6',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  caregiverName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  visitTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  taskProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  taskCount: {
    fontSize: 14,
    color: '#6B7280',
    minWidth: 80,
  },
  noVisitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  noVisitEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noVisitText: {
    fontSize: 16,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...createShadow(1, 0.05, 4, 1),
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  visitCaregiver: {
    fontSize: 14,
    color: '#6B7280',
  },
  visitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitStat: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
});
