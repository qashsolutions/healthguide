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
import { ClockIcon, LocationIcon, PersonIcon, CheckIcon, AlertIcon } from '@/components/icons';
import {
  MealIcon,
  CompanionshipIcon,
  CleaningIcon,
  MedicationIcon,
} from '@/components/icons/TaskIcons';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { OfflineIndicator } from '@/components/sync';

interface Assignment {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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

  const fetchTodayAssignments = useCallback(async () => {
    if (!user?.id) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          status,
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
        .order('start_time', { ascending: true });

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

  useEffect(() => {
    fetchTodayAssignments();
    fetchPendingInvitations();
  }, [fetchTodayAssignments, fetchPendingInvitations]);

  useFocusEffect(
    useCallback(() => {
      fetchPendingInvitations();
    }, [fetchPendingInvitations])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTodayAssignments(), fetchPendingInvitations()]);
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

        {/* Header - Large, easy to read */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
            </Text>
            <OfflineIndicator size="small" />
          </View>
          <Text style={styles.subtitle}>
            You have {assignments.length} visit{assignments.length !== 1 ? 's' : ''} today
          </Text>
        </View>

        {/* Today's Visits */}
        {assignments.map((visit) => (
          <Card
            key={visit.id}
            variant="elevated"
            padding="lg"
            style={styles.visitCard}
            onPress={() => router.push(getVisitRoute(visit.status, visit.id) as any)}
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
                  {visit.elder.first_name} {visit.elder.last_name}
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
                {formatTime(visit.start_time)} - {formatTime(visit.end_time)}
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
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>All done for today!</Text>
            <Text style={styles.emptySubtitle}>
              Check your schedule for upcoming visits
            </Text>
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
  emptyEmoji: {
    fontSize: 64,
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
});
