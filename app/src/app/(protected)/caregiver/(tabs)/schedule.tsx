// HealthGuide Caregiver Week Schedule
// Per healthguide-caregiver/schedule-view skill

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Badge } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ClockIcon, PersonIcon, LocationIcon, MoonIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { OfflineIndicator } from '@/components/sync';

interface Assignment {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  elder: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    address: string;
  };
}

interface WeekCounts {
  [date: string]: number;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CaregiverScheduleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [weekCounts, setWeekCounts] = useState<WeekCounts>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const todayIndex = new Date().getDay();

  const getWeekDates = useCallback(() => {
    const dates: { date: Date; dayNum: number }[] = [];
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      dates.push({ date, dayNum: date.getDate() });
    }
    return dates;
  }, []);

  const weekDates = getWeekDates();

  // Fetch assignments for selected date
  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('visits')
      .select(`
        id,
        scheduled_date,
        scheduled_start,
        scheduled_end,
        status,
        elder:elders (
          id,
          first_name,
          last_name,
          photo_url,
          address
        )
      `)
      .eq('caregiver_id', user.id)
      .eq('scheduled_date', dateStr)
      .order('scheduled_start', { ascending: true });

    if (error) {
      console.error('Error fetching assignments:', error);
    } else {
      // Transform Supabase joins (arrays) to objects
      const transformed = (data || []).map((item: any) => ({
        ...item,
        elder: Array.isArray(item.elder) ? item.elder[0] : item.elder,
      }));
      setAssignments(transformed);
    }
    setLoading(false);
  }, [user?.id, selectedDate]);

  // Fetch week counts for indicators
  const fetchWeekCounts = useCallback(async () => {
    if (!user?.id) return;

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const startDate = format(weekStart, 'yyyy-MM-dd');
    const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('visits')
      .select('scheduled_date')
      .eq('caregiver_id', user.id)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);

    if (data) {
      const counts: WeekCounts = {};
      data.forEach((a) => {
        counts[a.scheduled_date] = (counts[a.scheduled_date] || 0) + 1;
      });
      setWeekCounts(counts);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAssignments();
    fetchWeekCounts();
  }, [fetchAssignments, fetchWeekCounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAssignments(), fetchWeekCounts()]);
    setRefreshing(false);
  };

  const handleDaySelect = (dayIndex: number, date: Date) => {
    Haptics.selectionAsync();
    setSelectedDay(dayIndex);
    setSelectedDate(date);
  };

  const handleAssignmentPress = (assignment: Assignment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (assignment.status === 'scheduled') {
      router.push(`/(protected)/caregiver/visit/${assignment.id}/check-in`);
    } else if (assignment.status === 'in_progress') {
      router.push(`/(protected)/caregiver/visit/${assignment.id}/tasks`);
    } else {
      router.push(`/(protected)/caregiver/visit/${assignment.id}`);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge label="Tap to Check In" variant="info" size="md" />;
      case 'in_progress':
        return <Badge label="In Progress" variant="warning" size="md" />;
      case 'completed':
        return <Badge label="Completed" variant="success" size="md" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Week Header */}
      <View style={styles.weekHeader}>
        <View style={styles.weekTitleRow}>
          <Text style={styles.weekTitle}>{format(selectedDate, 'MMMM yyyy')}</Text>
          <OfflineIndicator size="small" />
        </View>
        <View style={styles.weekRow}>
          {weekDays.map((day, index) => {
            const dateInfo = weekDates[index];
            const dateStr = format(dateInfo.date, 'yyyy-MM-dd');
            const hasVisits = (weekCounts[dateStr] || 0) > 0;
            const isToday = index === todayIndex;
            const isSelected = index === selectedDay;

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isToday && !isSelected && styles.dayButtonToday,
                ]}
                onPress={() => handleDaySelect(index, dateInfo.date)}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${dateInfo.dayNum}, ${weekCounts[dateStr] || 0} visits`}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && !isSelected && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {dateInfo.dayNum}
                </Text>
                {hasVisits && !isSelected && (
                  <View style={styles.dotIndicator} />
                )}
                {hasVisits && isSelected && (
                  <View style={styles.dotIndicatorSelected} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Day Schedule */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.dayTitle}>
          {selectedDay === todayIndex ? 'Today' : fullDays[selectedDay]}
        </Text>

        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <Pressable
              key={assignment.id}
              onPress={() => handleAssignmentPress(assignment)}
            >
              <Card variant="default" padding="lg" style={styles.visitCard}>
                <View style={styles.visitRow}>
                  <View style={styles.avatarSmall}>
                    <PersonIcon size={28} color={roleColors.careseeker} />
                  </View>
                  <View style={styles.visitInfo}>
                    <Text style={styles.elderName}>
                      {assignment.elder.first_name} {assignment.elder.last_name}
                    </Text>
                    <View style={styles.timeRow}>
                      <ClockIcon size={18} color={colors.text.secondary} />
                      <Text style={styles.timeText}>
                        {formatTime(assignment.scheduled_start)} - {formatTime(assignment.scheduled_end)}
                      </Text>
                    </View>
                    <View style={styles.addressRow}>
                      <LocationIcon size={16} color={colors.text.tertiary} />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {assignment.elder.address}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  {getStatusBadge(assignment.status)}
                </View>
              </Card>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyDay}>
            <View style={styles.emptyIcon}><MoonIcon size={48} color={colors.neutral[300]} /></View>
            <Text style={styles.emptyText}>No visits scheduled</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
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
  weekHeader: {
    backgroundColor: colors.surface,
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  weekTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  weekTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    minWidth: 44,
  },
  dayButtonSelected: {
    backgroundColor: roleColors.caregiver,
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
    ...typography.caregiver.label,
    color: colors.text.primary,
  },
  dayNumberToday: {
    color: roleColors.caregiver,
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: colors.white,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: roleColors.caregiver,
    marginTop: spacing[1],
  },
  scrollContent: {
    padding: spacing[4],
  },
  dayTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  visitCard: {
    marginBottom: spacing[3],
    borderLeftWidth: 4,
    borderLeftColor: roleColors.caregiver,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: roleColors.careseeker + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  visitInfo: {
    flex: 1,
  },
  elderName: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  timeText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
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
  dayButtonToday: {
    borderWidth: 2,
    borderColor: roleColors.caregiver,
  },
  dotIndicatorSelected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginTop: spacing[1],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  addressText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
  cardFooter: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    alignItems: 'flex-end',
  },
});
