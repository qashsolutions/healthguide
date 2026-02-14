// HealthGuide Agency Dashboard
// Per healthguide-agency/dashboard skill - Real-time stats and activity

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Badge } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  UsersIcon,
  PersonIcon,
  CalendarIcon,
  CheckIcon,
  AlertIcon,
  ClockIcon,
} from '@/components/icons';

interface DashboardStats {
  totalCaregivers: number;
  activeCaregivers: number;
  totalElders: number;
  activeElders: number;
  visitsToday: number;
  completedToday: number;
  inProgressToday: number;
  upcomingToday: number;
  completionRate: number;
}

interface TodayVisit {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  caregiver: { first_name: string; last_name: string } | null;
  elder: { first_name: string; last_name: string } | null;
}

interface RecentActivity {
  id: string;
  type: 'check_in' | 'check_out' | 'task_complete';
  caregiver_name: string;
  elder_name: string;
  detail?: string;
  time: string;
}

interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export default function AgencyDashboard() {
  const { user, agency } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayVisits, setTodayVisits] = useState<TodayVisit[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!agency?.id) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch stats in parallel
      const [
        caregiversResult,
        eldersResult,
        visitsResult,
        activityResult,
      ] = await Promise.all([
        // Caregivers count
        supabase
          .from('caregivers')
          .select('id, is_active', { count: 'exact' })
          .eq('agency_id', agency.id),

        // Elders count
        supabase
          .from('elders')
          .select('id, is_active', { count: 'exact' })
          .eq('agency_id', agency.id),

        // Today's visits
        supabase
          .from('assignments')
          .select(`
            id,
            scheduled_date,
            start_time,
            end_time,
            status,
            caregiver:caregivers (
              user:user_profiles (first_name, last_name)
            ),
            elder:elders (first_name, last_name)
          `)
          .eq('agency_id', agency.id)
          .eq('scheduled_date', today)
          .order('start_time', { ascending: true }),

        // Recent activity (last 10 completed/in-progress visits)
        supabase
          .from('assignments')
          .select(`
            id,
            status,
            actual_check_in,
            actual_check_out,
            caregiver:caregivers (
              user:user_profiles (first_name, last_name)
            ),
            elder:elders (first_name, last_name)
          `)
          .eq('agency_id', agency.id)
          .in('status', ['completed', 'in_progress'])
          .order('updated_at', { ascending: false })
          .limit(10),
      ]);

      // Process caregivers
      const caregivers = caregiversResult.data || [];
      const activeCaregivers = caregivers.filter((c: any) => c.is_active).length;

      // Process elders
      const elders = eldersResult.data || [];
      const activeElders = elders.filter((e: any) => e.is_active).length;

      // Process visits
      const visits = (visitsResult.data || []).map((v: any) => ({
        ...v,
        caregiver: Array.isArray(v.caregiver) ? v.caregiver[0] : v.caregiver,
        elder: Array.isArray(v.elder) ? v.elder[0] : v.elder,
      }));

      const completedToday = visits.filter((v: any) => v.status === 'completed').length;
      const inProgressToday = visits.filter((v: any) => v.status === 'in_progress').length;
      const upcomingToday = visits.filter((v: any) => v.status === 'scheduled').length;

      // Transform visits for display
      const transformedVisits: TodayVisit[] = visits.map((v: any) => {
        const caregiverUser = v.caregiver?.user;
        const caregiverData = Array.isArray(caregiverUser) ? caregiverUser[0] : caregiverUser;
        return {
          id: v.id,
          scheduled_date: v.scheduled_date,
          start_time: v.start_time,
          end_time: v.end_time,
          status: v.status,
          caregiver: caregiverData ? {
            first_name: caregiverData.first_name || '',
            last_name: caregiverData.last_name || '',
          } : null,
          elder: v.elder ? {
            first_name: v.elder.first_name || '',
            last_name: v.elder.last_name || '',
          } : null,
        };
      });

      // Process recent activity
      const activity: RecentActivity[] = (activityResult.data || []).slice(0, 5).map((a: any) => {
        const caregiverRaw = Array.isArray(a.caregiver) ? a.caregiver[0] : a.caregiver;
        const caregiverUser = caregiverRaw?.user;
        const caregiverData = Array.isArray(caregiverUser) ? caregiverUser[0] : caregiverUser;
        const elderRaw = Array.isArray(a.elder) ? a.elder[0] : a.elder;

        const caregiverName = caregiverData
          ? `${caregiverData.first_name} ${caregiverData.last_name?.charAt(0) || ''}.`
          : 'Unknown';
        const elderName = elderRaw
          ? `${elderRaw.first_name} ${elderRaw.last_name?.charAt(0) || ''}.`
          : 'Unknown';

        let type: 'check_in' | 'check_out' | 'task_complete' = 'check_in';
        let time = '';

        if (a.status === 'completed' && a.actual_check_out) {
          type = 'check_out';
          time = format(new Date(a.actual_check_out), 'h:mm a');
        } else if (a.actual_check_in) {
          type = 'check_in';
          time = format(new Date(a.actual_check_in), 'h:mm a');
        }

        return {
          id: a.id,
          type,
          caregiver_name: caregiverName,
          elder_name: elderName,
          time,
        };
      });

      // Calculate stats
      const calculatedStats: DashboardStats = {
        totalCaregivers: caregivers.length,
        activeCaregivers,
        totalElders: elders.length,
        activeElders,
        visitsToday: visits.length,
        completedToday,
        inProgressToday,
        upcomingToday,
        completionRate: visits.length > 0
          ? Math.round((completedToday / visits.length) * 100)
          : 0,
      };

      // Generate alerts
      const generatedAlerts: Alert[] = [];

      // Check for late check-ins (visits scheduled but not started within 15 min)
      const now = new Date();
      visits.forEach((v: any) => {
        if (v.status === 'scheduled') {
          const [hours, minutes] = v.start_time.split(':');
          const scheduledTime = new Date();
          scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0);

          const diffMinutes = (now.getTime() - scheduledTime.getTime()) / 60000;
          if (diffMinutes > 15) {
            generatedAlerts.push({
              id: `late-${v.id}`,
              type: 'late_checkin',
              title: 'Late Check-in',
              description: `${v.elder?.first_name || 'Elder'}'s visit is ${Math.round(diffMinutes)} minutes late`,
              priority: diffMinutes > 30 ? 'high' : 'medium',
            });
          }
        }
      });

      setStats(calculatedStats);
      setTodayVisits(transformedVisits);
      setRecentActivity(activity);
      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [agency?.id]);

  // Fetch on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success[500];
      case 'in_progress': return colors.warning[500];
      case 'scheduled': return colors.primary[500];
      default: return colors.neutral[400];
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.agency_owner} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
          </Text>
          <Text style={styles.agencyName}>
            {agency?.name || 'Your Agency'}
          </Text>
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={styles.alertsSection}>
            {alerts.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  alert.priority === 'high' && styles.alertHigh,
                ]}
              >
                <AlertIcon
                  size={20}
                  color={alert.priority === 'high' ? colors.error[600] : colors.warning[600]}
                />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Active Visits"
              value={stats.inProgressToday}
              icon={<CheckIcon size={24} color={colors.success[500]} />}
              color={colors.success[500]}
            />
            <StatCard
              title="Caregivers"
              value={`${stats.activeCaregivers}/${stats.totalCaregivers}`}
              icon={<UsersIcon size={24} color={roleColors.caregiver} />}
              color={roleColors.caregiver}
            />
            <StatCard
              title="Elders"
              value={`${stats.activeElders}/${stats.totalElders}`}
              icon={<PersonIcon size={24} color={roleColors.careseeker} />}
              color={roleColors.careseeker}
            />
            <StatCard
              title="Today's Visits"
              value={`${stats.completedToday}/${stats.visitsToday}`}
              icon={<CalendarIcon size={24} color={roleColors.agency_owner} />}
              color={roleColors.agency_owner}
            />
          </View>
        )}

        {/* Find Caregivers */}
        <Pressable
          style={styles.findCaregiversCard}
          onPress={() => router.push('/(protected)/agency/caregiver-directory')}
        >
          <View style={styles.findCaregiversIcon}>
            <UsersIcon size={28} color={colors.success[600]} />
          </View>
          <View style={styles.findCaregiversText}>
            <Text style={styles.findCaregiversTitle}>Find Caregivers</Text>
            <Text style={styles.findCaregiversSubtitle}>Browse available caregivers in your area</Text>
          </View>
        </Pressable>

        {/* Today's Schedule Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Pressable onPress={() => router.push('/(protected)/agency/(tabs)/schedule')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>

          {todayVisits.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <Text style={styles.emptyText}>No visits scheduled for today</Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.visitsScroll}
            >
              {todayVisits.slice(0, 5).map((visit) => (
                <Pressable
                  key={visit.id}
                  style={styles.visitCard}
                  onPress={() => router.push(`/(protected)/agency/visit/${visit.id}`)}
                >
                  <View style={styles.visitTime}>
                    <ClockIcon size={14} color={colors.text.secondary} />
                    <Text style={styles.visitTimeText}>
                      {formatTime(visit.start_time)} - {formatTime(visit.end_time)}
                    </Text>
                  </View>
                  <Text style={styles.visitElder} numberOfLines={1}>
                    {visit.elder?.first_name} {visit.elder?.last_name}
                  </Text>
                  <Text style={styles.visitCaregiver} numberOfLines={1}>
                    {visit.caregiver?.first_name} {visit.caregiver?.last_name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(visit.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
                      {visit.status.replace('_', ' ')}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Completion Rate */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <Card variant="outlined" padding="md">
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Completion Rate</Text>
                <Text style={styles.progressValue}>{stats.completionRate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${stats.completionRate}%` },
                  ]}
                />
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Badge label="Completed" variant="success" size="sm" />
                  <Text style={styles.progressStatValue}>{stats.completedToday}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Badge label="In Progress" variant="warning" size="sm" />
                  <Text style={styles.progressStatValue}>{stats.inProgressToday}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Badge label="Upcoming" variant="info" size="sm" />
                  <Text style={styles.progressStatValue}>{stats.upcomingToday}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.map((activity) => (
              <Card key={activity.id} variant="default" padding="sm" style={styles.activityCard}>
                <View style={styles.activityContent}>
                  <View style={styles.activityIcon}>
                    {activity.type === 'check_in' && (
                      <View style={[styles.dot, { backgroundColor: colors.success[500] }]} />
                    )}
                    {activity.type === 'check_out' && (
                      <View style={[styles.dot, { backgroundColor: colors.primary[500] }]} />
                    )}
                    {activity.type === 'task_complete' && (
                      <CheckIcon size={16} color={colors.success[500]} />
                    )}
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>
                      {activity.caregiver_name} → {activity.elder_name}
                    </Text>
                    <Text style={styles.activitySubtitle}>
                      {activity.type === 'check_in' && 'Checked in'}
                      {activity.type === 'check_out' && 'Checked out'}
                      {activity.type === 'task_complete' && activity.detail}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Card>
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
  loadingText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  welcomeSection: {
    marginBottom: spacing[4],
  },
  welcomeText: {
    ...typography.styles.bodyLarge,
    color: colors.text.secondary,
  },
  agencyName: {
    ...typography.styles.h2,
    color: colors.text.primary,
  },
  alertsSection: {
    marginBottom: spacing[4],
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  alertHigh: {
    backgroundColor: colors.error[50],
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  alertDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statCard: {
    width: '47%',
    padding: spacing[4],
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  statValue: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  statTitle: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  viewAllLink: {
    ...typography.styles.label,
    color: colors.primary[600],
  },
  findCaregiversCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.success[100],
    marginBottom: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  findCaregiversIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  findCaregiversText: {
    flex: 1,
  },
  findCaregiversTitle: {
    ...typography.styles.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  findCaregiversSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  visitsScroll: {
    gap: spacing[3],
  },
  visitCard: {
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginRight: spacing[3],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  visitTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  visitTimeText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  visitElder: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  visitCaregiver: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.styles.caption,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressLabel: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  progressValue: {
    ...typography.styles.h4,
    color: colors.success[600],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success[500],
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
    gap: spacing[1],
  },
  progressStatValue: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  activityCard: {
    marginBottom: spacing[2],
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  activitySubtitle: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  activityTime: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
});
