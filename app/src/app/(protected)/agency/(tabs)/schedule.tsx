// HealthGuide Agency Scheduling
// Per healthguide-agency/scheduling skill

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CalendarIcon, ClockIcon, PersonIcon, PlusIcon, ChevronRightIcon } from '@/components/icons';

interface ScheduledVisit {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  caregiver_name: string;
  elder_name: string;
  tasks: string[];
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday start

  useFocusEffect(
    useCallback(() => {
      fetchVisits();
    }, [selectedDate])
  );

  async function fetchVisits() {
    if (!user?.agency_id) return;

    try {
      const weekEnd = addDays(weekStart, 6);

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          status,
          tasks,
          caregiver:caregivers (
            full_name,
            user:user_profiles!user_id (first_name, last_name)
          ),
          elder:elders (
            full_name,
            preferred_name
          )
        `)
        .eq('agency_id', user.agency_id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date')
        .order('start_time');

      if (error) throw error;

      if (data) {
        const formattedVisits = data.map((v: any) => {
          // Transform caregiver join
          const caregiverRaw = Array.isArray(v.caregiver) ? v.caregiver[0] : v.caregiver;
          const caregiverUserRaw = caregiverRaw?.user;
          const caregiverUser = Array.isArray(caregiverUserRaw) ? caregiverUserRaw[0] : caregiverUserRaw;
          const caregiverName = caregiverRaw?.full_name ||
            (caregiverUser ? `${caregiverUser.first_name} ${caregiverUser.last_name}` : 'Unassigned');

          // Transform elder join
          const elderRaw = Array.isArray(v.elder) ? v.elder[0] : v.elder;
          const elderName = elderRaw?.preferred_name || elderRaw?.full_name || 'Unknown Elder';

          return {
            id: v.id,
            scheduled_date: v.scheduled_date,
            start_time: v.start_time || '00:00',
            end_time: v.end_time || '00:00',
            status: v.status || 'scheduled',
            caregiver_name: caregiverName,
            elder_name: elderName,
            tasks: v.tasks || [],
          };
        });

        setVisits(formattedVisits);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchVisits();
    setRefreshing(false);
  }

  // Generate dates for the week view
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Filter visits for selected day
  const selectedDayVisits = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return visits.filter((v) => v.scheduled_date === dateStr);
  }, [visits, selectedDate]);

  // Get visit count for a day
  function getVisitCountForDay(date: Date): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    return visits.filter((v) => v.scheduled_date === dateStr).length;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', variant: 'success' as const };
      case 'in_progress':
        return { label: 'In Progress', variant: 'warning' as const };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'error' as const };
      case 'missed':
        return { label: 'Missed', variant: 'error' as const };
      default:
        return { label: 'Scheduled', variant: 'neutral' as const };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success[500];
      case 'in_progress':
        return colors.warning[500];
      case 'cancelled':
      case 'missed':
        return colors.error[500];
      default:
        return colors.neutral[400];
    }
  };

  function formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Week Navigation */}
      <View style={styles.calendarSection}>
        <View style={styles.weekNav}>
          <Pressable onPress={() => setSelectedDate(addDays(selectedDate, -7))}>
            <Text style={styles.navButton}>Prev</Text>
          </Pressable>
          <Text style={styles.weekLabel}>
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </Text>
          <Pressable onPress={() => setSelectedDate(addDays(selectedDate, 7))}>
            <Text style={styles.navButton}>Next</Text>
          </Pressable>
        </View>

        {/* Week Days */}
        <View style={styles.weekRow}>
          {weekDates.map((date, index) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = isSameDay(date, selectedDate);
            const visitCount = getVisitCountForDay(date);

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isToday && !isSelected && styles.dayButtonToday,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {format(date, 'EEE')}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
                {visitCount > 0 && (
                  <View style={[styles.slotIndicator, isSelected && styles.slotIndicatorSelected]}>
                    <Text style={[styles.slotCount, isSelected && styles.slotCountSelected]}>
                      {visitCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Day Header */}
      <View style={styles.header}>
        <Text style={styles.dateTitle}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        <Button
          title="+ Add"
          variant="primary"
          size="sm"
          onPress={() => {
            router.push(`/(protected)/agency/assignment/new?date=${format(selectedDate, 'yyyy-MM-dd')}`);
          }}
        />
      </View>

      {/* Schedule List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading schedule...</Text>
          </View>
        ) : selectedDayVisits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {isSameDay(selectedDate, new Date()) ? '' : ''}
            </Text>
            <Text style={styles.emptyText}>No visits scheduled</Text>
            <Text style={styles.emptySubtext}>
              Tap "+ Add" to schedule a visit
            </Text>
          </View>
        ) : (
          selectedDayVisits.map((visit) => {
            const statusBadge = getStatusBadge(visit.status);

            return (
              <Card
                key={visit.id}
                variant="default"
                padding="md"
                style={styles.visitCard}
                onPress={() => router.push(`/(protected)/agency/assignment/${visit.id}`)}
              >
                <View style={styles.visitHeader}>
                  <View style={styles.timeContainer}>
                    <ClockIcon size={16} color={colors.text.secondary} />
                    <Text style={styles.timeText}>
                      {formatTime(visit.start_time)} - {formatTime(visit.end_time)}
                    </Text>
                  </View>
                  <Badge
                    label={statusBadge.label}
                    variant={statusBadge.variant}
                    size="sm"
                  />
                </View>

                <View style={styles.visitBody}>
                  <View style={styles.personRow}>
                    <PersonIcon size={20} color={roleColors.caregiver} />
                    <Text style={styles.personText}>{visit.caregiver_name}</Text>
                    <Text style={styles.arrow}></Text>
                    <PersonIcon size={20} color={roleColors.careseeker} />
                    <Text style={styles.personText}>{visit.elder_name}</Text>
                  </View>

                  {visit.tasks.length > 0 && (
                    <View style={styles.tasksRow}>
                      {visit.tasks.slice(0, 3).map((task, index) => (
                        <View key={index} style={styles.taskChip}>
                          <Text style={styles.taskText}>{task}</Text>
                        </View>
                      ))}
                      {visit.tasks.length > 3 && (
                        <View style={styles.taskChip}>
                          <Text style={styles.taskText}>+{visit.tasks.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Status indicator bar */}
                <View
                  style={[
                    styles.statusBar,
                    { backgroundColor: getStatusColor(visit.status) },
                  ]}
                />
              </Card>
            );
          })
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
  calendarSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  navButton: {
    ...typography.styles.body,
    color: colors.primary[500],
    fontWeight: '500',
  },
  weekLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[2],
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    minWidth: 44,
  },
  dayButtonSelected: {
    backgroundColor: roleColors.agency_owner,
  },
  dayButtonToday: {
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  dayLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  dayLabelSelected: {
    color: colors.white,
  },
  dayNumber: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  dayNumberToday: {
    color: colors.primary[500],
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: colors.white,
  },
  slotIndicator: {
    backgroundColor: colors.success[500],
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  slotIndicatorSelected: {
    backgroundColor: colors.white,
  },
  slotCount: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  slotCountSelected: {
    color: roleColors.agency_owner,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  dateTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  scrollContent: {
    padding: spacing[4],
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  visitCard: {
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  timeText: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  visitBody: {
    gap: spacing[2],
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  personText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  arrow: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  tasksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  taskChip: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  taskText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
  },
});
