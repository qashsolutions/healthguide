// HealthGuide Caregiver Today Screen
// Per healthguide-caregiver/schedule-view skill - Icon-based, large touch targets

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius } from '@/theme/spacing';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ClockIcon, LocationIcon, PersonIcon, CheckIcon, AlertIcon, SparkleIcon } from '@/components/icons';
import {
  MealIcon,
  CompanionshipIcon,
  CleaningIcon,
  MedicationIcon,
} from '@/components/icons/TaskIcons';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { OfflineIndicator } from '@/components/sync';
import { NotificationBell } from '@/components/NotificationBell';
import { registerForPushNotifications } from '@/lib/notifications';

interface Assignment {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_recurring?: boolean;
  parent_visit_id?: string | null;
  elder: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
  };
  assignment_tasks?: {
    id: string;
    task: {
      name: string;
      icon: string;
      category: string;
    };
  }[];
}

const TaskIcon = ({ type, size = 32 }: { type: string; size?: number }) => {
  switch (type) {
    case 'meal':
      return <MealIcon size={size} />;
    case 'medication':
      return <MedicationIcon size={size} />;
    case 'companionship':
      return <CompanionshipIcon size={size} />;
    case 'cleaning':
      return <CleaningIcon size={size} />;
    default:
      return <CheckIcon size={size} />;
  }
};

export default function CaregiverTodayScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [caregiverType, setCaregiverType] = useState<string | null>(null);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [linkedAgencies, setLinkedAgencies] = useState<{ id: string; name: string }[]>([]);

  const fetchTodayAssignments = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_start,
          scheduled_end,
          status,
          is_recurring,
          parent_visit_id,
          elder:elders (
            id,
            first_name,
            last_name,
            address
          ),
          visit_tasks (
            id,
            task:task_library (
              name,
              icon,
              category
            )
          )
        `)
        .eq('caregiver_id', user.id)
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      // Transform Supabase joins (arrays) to objects
      const transformed = (data || []).map((item: any) => ({
        ...item,
        elder: Array.isArray(item.elder) ? item.elder[0] : item.elder,
        assignment_tasks: (item.visit_tasks || []).map((at: any) => ({
          ...at,
          task: Array.isArray(at.task) ? at.task[0] : at.task,
        })),
      }));
      setAssignments(transformed);
    } catch (error) {
      console.error('Error fetching today assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const [requestCount, setRequestCount] = useState(0);

  const fetchPendingInvitations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('care_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'caregiver')
        .eq('consent_status', 'pending')
        .eq('is_active', true);

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  }, [user?.id]);

  const fetchVisitRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { count } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('companion_id', user.id)
        .eq('status', 'pending');
      setRequestCount(count || 0);
    } catch {
      // Non-critical
    }
  }, [user?.id]);

  const fetchProfileAndStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Get caregiver profile
      const { data: profile } = await supabase
        .from('caregiver_profiles')
        .select('id, caregiver_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setCaregiverType(profile.caregiver_type);

        // Linked agencies
        const { data: links } = await supabase
          .from('caregiver_agency_links')
          .select('agencies(id, name)')
          .eq('caregiver_profile_id', profile.id)
          .eq('status', 'active');

        if (links) {
          setLinkedAgencies(
            links
              .map((l: any) => {
                const a = Array.isArray(l.agencies) ? l.agencies[0] : l.agencies;
                return a ? { id: a.id, name: a.name } : null;
              })
              .filter(Boolean) as { id: string; name: string }[]
          );
        }
      }

      // Completed visits stats
      const { data: completedVisits } = await supabase
        .from('visits')
        .select('id, duration_minutes')
        .eq('caregiver_id', user.id)
        .eq('status', 'completed');

      setTotalCompleted(completedVisits?.length || 0);
      setTotalHours(
        Math.round(
          (completedVisits?.reduce((sum, v: any) => sum + (v.duration_minutes || 0), 0) || 0) / 60
        )
      );

      // Average rating
      const { data: ratingSummary } = await supabase
        .from('user_ratings_summary')
        .select('avg_rating, total_ratings')
        .eq('rated_user', user.id)
        .maybeSingle();

      if (ratingSummary) {
        setAvgRating(ratingSummary.avg_rating);
      }

      // Upcoming visits (next 7 days, excluding today)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekOut = new Date();
      weekOut.setDate(weekOut.getDate() + 7);

      const { data: upcoming } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_start, scheduled_end, status,
          elder:elders(first_name, last_name)
        `)
        .eq('caregiver_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', format(tomorrow, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekOut, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (upcoming) {
        setUpcomingVisits(
          upcoming.map((v: any) => ({
            ...v,
            elder: Array.isArray(v.elder) ? v.elder[0] : v.elder,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching profile/stats:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTodayAssignments();
    fetchPendingInvitations();
    fetchVisitRequests();
    fetchProfileAndStats();
    // Register for push notifications (no-op on web)
    if (user?.id) {
      registerForPushNotifications(user.id, 'caregiver');
    }
  }, [fetchTodayAssignments, fetchPendingInvitations, fetchVisitRequests, fetchProfileAndStats]);

  useFocusEffect(
    useCallback(() => {
      fetchPendingInvitations();
      fetchVisitRequests();
    }, [fetchPendingInvitations, fetchVisitRequests])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTodayAssignments(), fetchPendingInvitations(), fetchVisitRequests(), fetchProfileAndStats()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const getVisitRoute = (status: string, id: string) => {
    if (status === 'scheduled') {
      return `/(protected)/caregiver/visit/${id}/check-in`;
    }
    if (status === 'in_progress') {
      return `/(protected)/caregiver/visit/${id}/tasks`;
    }
    return `/(protected)/caregiver/visit/${id}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
          <Text style={styles.loadingText}>Loading today's visits...</Text>
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
        {/* Pending Visit Requests Banner */}
        {requestCount > 0 && (
          <Pressable
            style={styles.requestBanner}
            onPress={() => router.push('/(protected)/caregiver/requests' as any)}
          >
            <PersonIcon size={20} color={colors.primary[600]} />
            <Text style={styles.requestBannerText}>
              {requestCount} new visit request{requestCount > 1 ? 's' : ''} — tap to respond
            </Text>
          </Pressable>
        )}

        {/* Pending Invitations Banner */}
        {pendingCount > 0 && (
          <Pressable
            style={styles.invitationBanner}
            onPress={() => router.push('/(protected)/caregiver/pending-invitations' as any)}
          >
            <AlertIcon size={20} color={colors.warning[600]} />
            <Text style={styles.invitationBannerText}>
              You have {pendingCount} pending care group invitation{pendingCount > 1 ? 's' : ''}
            </Text>
          </Pressable>
        )}

        {/* Find Agencies link — for companion types */}
        {(user?.caregiver_type === 'student' || user?.caregiver_type === 'companion_55') && (
          <Pressable
            style={styles.agenciesBanner}
            onPress={() => router.push('/(protected)/caregiver/agencies-near-me' as any)}
          >
            <LocationIcon size={18} color="#059669" />
            <Text style={styles.agenciesBannerText}>Find agencies near you</Text>
          </Pressable>
        )}

        {/* Header - Large, easy to read */}
        <GradientHeader roleColor={roleColors.caregiver}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.greeting}>
                {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <NotificationBell />
                <OfflineIndicator size="small" />
              </View>
            </View>
            <Text style={styles.subtitle}>
              You have {assignments.length} visit{assignments.length !== 1 ? 's' : ''} today
            </Text>
          </View>
        </GradientHeader>

        {/* Today's Visits */}
        {assignments.map((visit) => (
          <Card
            key={visit.id}
            variant="elevated"
            padding="lg"
            style={styles.visitCard}
          >
            {/* Status Badge for in-progress visits */}
            {visit.status === 'in_progress' && (
              <Badge label="In Progress" variant="warning" size="md" style={styles.statusBadge} />
            )}

            {/* Elder Info - Large text */}
            <View style={styles.elderSection}>
              <View style={styles.elderAvatar}>
                <PersonIcon size={40} color={roleColors.careseeker} />
              </View>
              <View style={styles.elderInfo}>
                <Text style={styles.elderName}>
                  {(visit.is_recurring || visit.parent_visit_id) ? '\uD83D\uDD01 ' : ''}{visit.elder.first_name} {visit.elder.last_name}
                </Text>
                <View style={styles.locationRow}>
                  <LocationIcon size={18} color={colors.text.secondary} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {visit.elder.address}
                  </Text>
                </View>
              </View>
            </View>

            {/* Time - Very prominent */}
            <View style={styles.timeSection}>
              <ClockIcon size={28} color={roleColors.caregiver} />
              <Text style={styles.timeText}>
                {formatTime(visit.scheduled_start)} - {formatTime(visit.scheduled_end)}
              </Text>
            </View>

            {/* Tasks Preview - Icons */}
            {visit.assignment_tasks && visit.assignment_tasks.length > 0 && (
              <View style={styles.tasksSection}>
                <Text style={styles.tasksLabel}>Tasks:</Text>
                <View style={styles.tasksList}>
                  {visit.assignment_tasks.slice(0, 4).map((task, index) => (
                    <View key={index} style={styles.taskItem}>
                      <TaskIcon type={task.task?.icon || 'default'} size={36} />
                      <Text style={styles.taskName} numberOfLines={1}>
                        {task.task?.name || 'Task'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Start/Continue Button - Large tap target */}
            <Button
              title={visit.status === 'in_progress' ? 'Continue Visit' : 'Start Visit'}
              variant="primary"
              size="caregiver"
              fullWidth
              onPress={() => router.push(getVisitRoute(visit.status, visit.id) as any)}
              style={styles.startButton}
            />
          </Card>
        ))}

        {/* Empty State */}
        {assignments.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><SparkleIcon size={48} color={colors.neutral[300]} /></View>
            <Text style={styles.emptyTitle}>All done for today!</Text>
            <Text style={styles.emptySubtitle}>
              Check your schedule for upcoming visits
            </Text>
          </View>
        )}

        {/* Upcoming Visits (Next 7 Days) */}
        {upcomingVisits.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Upcoming Visits</Text>
            {upcomingVisits.map((visit) => (
              <Pressable
                key={visit.id}
                style={styles.upcomingCard}
                onPress={() => router.push(`/(protected)/caregiver/visit/${visit.id}` as any)}
              >
                <View style={styles.upcomingDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingElder}>
                    {visit.elder?.first_name} {visit.elder?.last_name}
                  </Text>
                  <Text style={styles.upcomingDate}>
                    {format(new Date(visit.scheduled_date + 'T00:00:00'), 'EEE, MMM d')} · {formatTime(visit.scheduled_start)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        {totalCompleted > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <Card padding="lg">
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{totalCompleted}</Text>
                  <Text style={styles.statLabel}>Visits</Text>
                </View>
                {avgRating != null && (
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{avgRating.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Avg Rating</Text>
                  </View>
                )}
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{totalHours}h</Text>
                  <Text style={styles.statLabel}>Logged</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Linked Agencies */}
        {linkedAgencies.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>My Agencies</Text>
            {linkedAgencies.map((a) => (
              <View key={a.id} style={styles.agencyRow}>
                <CheckIcon size={18} color={colors.success[500]} />
                <Text style={styles.agencyNameText}>{a.name}</Text>
              </View>
            ))}
            <Pressable
              style={styles.browseLink}
              onPress={() => router.push('/(protected)/caregiver/agencies-near-me' as any)}
            >
              <Text style={styles.browseLinkText}>Browse Agencies →</Text>
            </Pressable>
          </View>
        )}

        {/* Time Credits Teaser for 55+ */}
        {caregiverType === 'companion_55' && (
          <View style={styles.sectionContainer}>
            <View style={styles.timeCreditsCard}>
              <Text style={styles.timeCreditsText}>⏳ Time Credits: Coming Soon</Text>
            </View>
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
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary[50],
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: spacing[3],
  },
  requestBannerText: {
    ...typography.caregiver.body,
    color: colors.primary[700],
    fontWeight: '600',
    flex: 1,
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warning[50],
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning[200],
    marginBottom: spacing[3],
  },
  invitationBannerText: {
    ...typography.caregiver.body,
    color: colors.warning[700],
    fontWeight: '600',
    flex: 1,
  },
  agenciesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#05966910',
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#05966930',
    marginBottom: spacing[3],
  },
  agenciesBannerText: {
    ...typography.caregiver.body,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  header: {
    marginBottom: spacing[6],
    paddingTop: spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  visitCard: {
    marginBottom: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: roleColors.caregiver,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing[3],
  },
  elderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  elderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: roleColors.careseeker + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  elderInfo: {
    flex: 1,
  },
  elderName: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  addressText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontSize: 16,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: roleColors.caregiver + '10',
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  timeText: {
    ...typography.caregiver.heading,
    color: roleColors.caregiver,
    fontSize: 22,
  },
  tasksSection: {
    marginBottom: spacing[4],
  },
  tasksLabel: {
    ...typography.caregiver.label,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  tasksList: {
    flexDirection: 'row',
    gap: spacing[6],
  },
  taskItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  taskName: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  startButton: {
    marginTop: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sectionContainer: {
    marginTop: spacing[6],
  },
  sectionTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 20,
    marginBottom: spacing[3],
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  upcomingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: roleColors.caregiver,
  },
  upcomingElder: {
    ...typography.caregiver.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  upcomingDate: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 24,
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  agencyNameText: {
    ...typography.caregiver.body,
    color: colors.text.primary,
  },
  browseLink: {
    marginTop: spacing[2],
    alignItems: 'center',
  },
  browseLinkText: {
    ...typography.styles.label,
    color: roleColors.caregiver,
  },
  timeCreditsCard: {
    backgroundColor: colors.neutral[100],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  timeCreditsText: {
    ...typography.caregiver.body,
    color: colors.text.tertiary,
  },
});
