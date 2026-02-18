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
import { spacing, borderRadius, shadows, layout } from '@/theme/spacing';
import { GradientHeader } from '@/components/ui/GradientHeader';
import {
  UsersIcon,
  PersonIcon,
  CalendarIcon,
  CheckIcon,
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
  pendingToday: number;
  completionRate: number;
}

interface TodayVisit {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
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

interface CheckinDetail {
  id: string;
  caregiverName: string;
  elderName: string;
  scheduledTime: string;
  minutesLate: number;
  status: string;
}

interface CheckinGroups {
  red: CheckinDetail[];
  amber: CheckinDetail[];
  green: CheckinDetail[];
}

export default function AgencyDashboard() {
  const { user, agency } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayVisits, setTodayVisits] = useState<TodayVisit[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [checkinGroups, setCheckinGroups] = useState<CheckinGroups>({ red: [], amber: [], green: [] });
  const [expandedCard, setExpandedCard] = useState<'red' | 'amber' | 'green' | null>(null);

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
        // Caregivers count (via user_profiles since caregiver_profiles has no agency_id)
        supabase
          .from('user_profiles')
          .select('id, is_active', { count: 'exact' })
          .eq('agency_id', agency.id)
          .eq('role', 'caregiver'),

        // Elders count
        supabase
          .from('elders')
          .select('id, is_active', { count: 'exact' })
          .eq('agency_id', agency.id),

        // Today's visits
        supabase
          .from('visits')
          .select(`
            id,
            scheduled_date,
            scheduled_start,
            scheduled_end,
            status,
            caregiver:user_profiles!caregiver_id (first_name, last_name),
            elder:elders (first_name, last_name)
          `)
          .eq('agency_id', agency.id)
          .eq('scheduled_date', today)
          .order('scheduled_start', { ascending: true }),

        // Recent activity (last 10 completed/in-progress visits)
        supabase
          .from('visits')
          .select(`
            id,
            status,
            actual_start,
            actual_end,
            caregiver:user_profiles!caregiver_id (first_name, last_name),
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
      const pendingToday = visits.filter((v: any) => v.status === 'pending_acceptance').length;

      // Transform visits for display
      const transformedVisits: TodayVisit[] = visits.map((v: any) => {
        const caregiverData = v.caregiver;
        return {
          id: v.id,
          scheduled_date: v.scheduled_date,
          scheduled_start: v.scheduled_start,
          scheduled_end: v.scheduled_end,
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
        const elderRaw = Array.isArray(a.elder) ? a.elder[0] : a.elder;

        const caregiverName = caregiverRaw
          ? [caregiverRaw.first_name, caregiverRaw.last_name].filter(Boolean).join(' ') || 'Unknown'
          : 'Unknown';
        const elderName = elderRaw
          ? `${elderRaw.first_name} ${elderRaw.last_name?.charAt(0) || ''}.`
          : 'Unknown';

        let type: 'check_in' | 'check_out' | 'task_complete' = 'check_in';
        let time = '';

        if (a.status === 'completed' && a.actual_end) {
          type = 'check_out';
          time = format(new Date(a.actual_end), 'h:mm a');
        } else if (a.actual_start) {
          type = 'check_in';
          time = format(new Date(a.actual_start), 'h:mm a');
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
        pendingToday,
        completionRate: visits.length > 0
          ? Math.round((completedToday / visits.length) * 100)
          : 0,
      };

      // Categorize visits into check-in groups (Red / Amber / Green)
      const now = new Date();
      const groups: CheckinGroups = { red: [], amber: [], green: [] };

      visits.forEach((v: any) => {
        const caregiverName = v.caregiver
          ? `${v.caregiver.first_name} ${v.caregiver.last_name}`.trim()
          : 'Unassigned';
        const elderName = v.elder
          ? `${v.elder.first_name} ${v.elder.last_name}`.trim()
          : 'Unknown';

        const [hours, minutes] = v.scheduled_start.split(':');
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0);
        const formattedTime = format(scheduledTime, 'h:mm a');
        const diffMinutes = Math.max(0, (now.getTime() - scheduledTime.getTime()) / 60000);

        const detail: CheckinDetail = {
          id: v.id,
          caregiverName,
          elderName,
          scheduledTime: formattedTime,
          minutesLate: Math.round(diffMinutes),
          status: v.status,
        };

        if (v.status === 'scheduled' && diffMinutes > 30) {
          groups.red.push(detail);
        } else if (v.status === 'scheduled' && diffMinutes > 15) {
          groups.amber.push(detail);
        } else {
          groups.green.push(detail);
        }
      });

      setStats(calculatedStats);
      setTodayVisits(transformedVisits);
      setRecentActivity(activity);
      setCheckinGroups(groups);

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
      case 'pending_acceptance': return roleColors.caregiver;
      case 'declined': return colors.error[500];
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
        <GradientHeader roleColor={roleColors.agency_owner}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
            </Text>
            <Text style={styles.agencyName}>
              {agency?.name || 'Your Agency'}
            </Text>
          </View>
        </GradientHeader>

        {/* Check-in Summary Cards */}
        {stats && stats.visitsToday > 0 && (
          <View style={styles.checkinSection}>
            <View style={styles.checkinSummaryRow}>
              <Pressable
                style={[
                  styles.checkinCard,
                  styles.checkinCardRed,
                  checkinGroups.red.length === 0 && styles.checkinCardMuted,
                  expandedCard === 'red' && styles.checkinCardActive,
                ]}
                onPress={() => setExpandedCard(expandedCard === 'red' ? null : 'red')}
              >
                <Text style={styles.checkinCount}>{checkinGroups.red.length}</Text>
                <Text style={[styles.checkinLabel, { color: colors.error[700] }]}>Critical</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.checkinCard,
                  styles.checkinCardAmber,
                  checkinGroups.amber.length === 0 && styles.checkinCardMuted,
                  expandedCard === 'amber' && styles.checkinCardActive,
                ]}
                onPress={() => setExpandedCard(expandedCard === 'amber' ? null : 'amber')}
              >
                <Text style={styles.checkinCount}>{checkinGroups.amber.length}</Text>
                <Text style={[styles.checkinLabel, { color: colors.warning[700] }]}>Late</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.checkinCard,
                  styles.checkinCardGreen,
                  checkinGroups.green.length === 0 && styles.checkinCardMuted,
                  expandedCard === 'green' && styles.checkinCardActive,
                ]}
                onPress={() => setExpandedCard(expandedCard === 'green' ? null : 'green')}
              >
                <Text style={styles.checkinCount}>{checkinGroups.green.length}</Text>
                <Text style={[styles.checkinLabel, { color: colors.success[700] }]}>On Time</Text>
              </Pressable>
            </View>

            {expandedCard && checkinGroups[expandedCard].length > 0 && (
              <View style={styles.checkinDetailList}>
                {checkinGroups[expandedCard].map((detail) => (
                  <View
                    key={detail.id}
                    style={[
                      styles.checkinDetailRow,
                      expandedCard === 'red' && { borderLeftColor: colors.error[400] },
                      expandedCard === 'amber' && { borderLeftColor: colors.warning[400] },
                      expandedCard === 'green' && { borderLeftColor: colors.success[400] },
                    ]}
                  >
                    <Text style={styles.checkinDetailName} numberOfLines={1}>
                      {detail.caregiverName} → {detail.elderName}
                    </Text>
                    <Text style={styles.checkinDetailTime}>
                      Scheduled {detail.scheduledTime}
                      {expandedCard === 'green'
                        ? ` · ${detail.status === 'scheduled' ? 'Upcoming' : detail.status.replace('_', ' ')}`
                        : ` · ${detail.minutesLate} min late`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
              value={stats.totalCaregivers}
              icon={<UsersIcon size={24} color={roleColors.caregiver} />}
              color={roleColors.caregiver}
            />
            <StatCard
              title="Elders (max 20)"
              value={`${stats.activeElders} / 20`}
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
          onPress={() => router.push('/(protected)/agency/caregiver-directory' as any)}
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
                  onPress={() => router.push(`/(protected)/agency/visit/${visit.id}` as any)}
                >
                  <View style={styles.visitTime}>
                    <ClockIcon size={14} color={colors.text.secondary} />
                    <Text style={styles.visitTimeText}>
                      {formatTime(visit.scheduled_start)} - {formatTime(visit.scheduled_end)}
                    </Text>
                  </View>
                  <Text style={styles.visitElder} numberOfLines={1}>
                    {visit.elder?.first_name} {visit.elder?.last_name}
                  </Text>
                  <Text style={styles.visitCaregiver} numberOfLines={1}>
                    {visit.caregiver ? `${visit.caregiver.first_name} ${visit.caregiver.last_name}`.trim() : 'Unassigned'}
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
                {stats.pendingToday > 0 && (
                  <View style={styles.progressStat}>
                    <Badge label="Pending" variant="neutral" size="sm" />
                    <Text style={styles.progressStatValue}>{stats.pendingToday}</Text>
                  </View>
                )}
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
    paddingBottom: 100,
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
  checkinSection: {
    marginBottom: spacing[4],
  },
  checkinSummaryRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  checkinCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  checkinCardRed: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[200],
  },
  checkinCardAmber: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
  },
  checkinCardGreen: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[200],
  },
  checkinCardMuted: {
    opacity: 0.5,
  },
  checkinCardActive: {
    borderWidth: 2.5,
  },
  checkinCount: {
    ...typography.styles.h2,
    color: colors.text.primary,
  },
  checkinLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  checkinDetailList: {
    marginTop: spacing[3],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  checkinDetailRow: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.neutral[300],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  checkinDetailName: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  checkinDetailTime: {
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
    ...shadows.md,
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
