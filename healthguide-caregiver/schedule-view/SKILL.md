---
name: healthguide-caregiver-schedule-view
description: Daily and weekly schedule view for caregivers. Shows today's assignments with elder info, times, and locations. Large touch targets with icon-based navigation. Use when building caregiver home screen, daily schedule, or weekly calendar views.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: caregiver
  tags: [schedule, calendar, assignments, shifts]
---

# HealthGuide Caregiver Schedule View

## Overview
Caregivers see their daily assignments with large, easy-to-tap cards. Each card shows elder name, photo, time, and location. Minimal text - uses icons and visual indicators for status.

## Key Features

- Today's assignments as large cards
- Weekly calendar strip navigation
- Elder photo and basic info
- Color-coded shift status (upcoming, in-progress, completed)
- One-tap to start EVV check-in
- Pull-to-refresh for schedule updates

## Data Models

```typescript
interface ScheduleAssignment {
  id: string;
  elder_id: string;
  elder: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    address: string;
    latitude: number;
    longitude: number;
  };
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'missed';
  actual_check_in?: string;
  actual_check_out?: string;
  task_count: number;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  isToday: boolean;
  assignmentCount: number;
}
```

## Instructions

### Step 1: Schedule Screen Layout

```typescript
// app/(protected)/caregiver/schedule.tsx
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import { format, addDays, startOfWeek, isToday, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WeekStrip } from '@/components/schedule/WeekStrip';
import { AssignmentCard } from '@/components/schedule/AssignmentCard';
import { EmptySchedule } from '@/components/schedule/EmptySchedule';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useRouter } from 'expo-router';

export default function CaregiverScheduleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssignments = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('assignments')
      .select(`
        id,
        elder_id,
        scheduled_date,
        start_time,
        end_time,
        status,
        actual_check_in,
        actual_check_out,
        elder:elders (
          id,
          first_name,
          last_name,
          photo_url,
          address,
          latitude,
          longitude
        ),
        assignment_tasks (count)
      `)
      .eq('caregiver_id', user!.id)
      .eq('scheduled_date', dateStr)
      .order('start_time', { ascending: true });

    if (data) {
      const mapped = data.map((a: any) => ({
        ...a,
        elder: a.elder,
        task_count: a.assignment_tasks?.[0]?.count || 0,
      }));
      setAssignments(mapped);
    }
    setLoading(false);
  }, [selectedDate, user]);

  useEffect(() => {
    setLoading(true);
    fetchAssignments();
  }, [fetchAssignments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignments();
    setRefreshing(false);
  };

  const handleAssignmentPress = (assignment: ScheduleAssignment) => {
    if (assignment.status === 'scheduled') {
      // Go to EVV check-in
      router.push(`/caregiver/evv/check-in/${assignment.id}`);
    } else if (assignment.status === 'checked_in') {
      // Go to task list
      router.push(`/caregiver/tasks/${assignment.id}`);
    } else {
      // View completed assignment summary
      router.push(`/caregiver/summary/${assignment.id}`);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <WeekStrip
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        caregiverId={user!.id}
      />

      <ScrollView
        style={styles.assignmentsList}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {assignments.length === 0 ? (
          <EmptySchedule date={selectedDate} />
        ) : (
          assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onPress={() => handleAssignmentPress(assignment)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  assignmentsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
});
```

### Step 2: Week Strip Navigation Component

```typescript
// components/schedule/WeekStrip.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  caregiverId: string;
}

interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: string;
  hasAssignments: boolean;
  assignmentCount: number;
}

export function WeekStrip({ selectedDate, onDateSelect, caregiverId }: Props) {
  const [days, setDays] = useState<DayInfo[]>([]);

  useEffect(() => {
    generateWeekDays();
  }, [selectedDate]);

  async function generateWeekDays() {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekDays: DayInfo[] = [];

    // Generate 7 days
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      weekDays.push({
        date,
        dayName: format(date, 'EEE'),
        dayNumber: format(date, 'd'),
        hasAssignments: false,
        assignmentCount: 0,
      });
    }

    // Fetch assignment counts for the week
    const startDate = format(weekStart, 'yyyy-MM-dd');
    const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('assignments')
      .select('scheduled_date')
      .eq('caregiver_id', caregiverId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((a) => {
        counts[a.scheduled_date] = (counts[a.scheduled_date] || 0) + 1;
      });

      weekDays.forEach((day) => {
        const dateStr = format(day.date, 'yyyy-MM-dd');
        day.assignmentCount = counts[dateStr] || 0;
        day.hasAssignments = day.assignmentCount > 0;
      });
    }

    setDays(weekDays);
  }

  const handleDayPress = (date: Date) => {
    Haptics.selectionAsync();
    onDateSelect(date);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.monthYear}>
        {format(selectedDate, 'MMMM yyyy')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysContainer}
      >
        {days.map((day, index) => {
          const isSelected = isSameDay(day.date, selectedDate);
          const today = isToday(day.date);

          return (
            <Pressable
              key={index}
              style={[
                styles.dayButton,
                isSelected && styles.dayButtonSelected,
                today && !isSelected && styles.dayButtonToday,
              ]}
              onPress={() => handleDayPress(day.date)}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {day.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayTextSelected,
                  today && !isSelected && styles.dayNumberToday,
                ]}
              >
                {day.dayNumber}
              </Text>
              {day.hasAssignments && (
                <View
                  style={[
                    styles.dot,
                    isSelected && styles.dotSelected,
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  daysContainer: {
    paddingHorizontal: 8,
    gap: 8,
  },
  dayButton: {
    width: 48,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  dayButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayNumberToday: {
    color: '#3B82F6',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginTop: 4,
  },
  dotSelected: {
    backgroundColor: '#FFFFFF',
  },
});
```

### Step 3: Assignment Card Component

```typescript
// components/schedule/AssignmentCard.tsx
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ClockIcon, MapPinIcon, TaskIcon, CheckCircleIcon, PlayIcon } from '@/components/icons';

interface Props {
  assignment: {
    id: string;
    elder: {
      first_name: string;
      last_name: string;
      photo_url: string | null;
      address: string;
    };
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'checked_in' | 'completed' | 'missed';
    task_count: number;
  };
  onPress: () => void;
}

export function AssignmentCard({ assignment, onPress }: Props) {
  const { elder, start_time, end_time, status, task_count } = assignment;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'scheduled':
        return {
          color: '#3B82F6',
          bgColor: '#EFF6FF',
          label: 'TAP TO CHECK IN',
          icon: PlayIcon,
        };
      case 'checked_in':
        return {
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          label: 'IN PROGRESS',
          icon: TaskIcon,
        };
      case 'completed':
        return {
          color: '#10B981',
          bgColor: '#D1FAE5',
          label: 'COMPLETED',
          icon: CheckCircleIcon,
        };
      case 'missed':
        return {
          color: '#EF4444',
          bgColor: '#FEE2E2',
          label: 'MISSED',
          icon: ClockIcon,
        };
      default:
        return {
          color: '#6B7280',
          bgColor: '#F3F4F6',
          label: 'UNKNOWN',
          icon: ClockIcon,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  return (
    <Pressable
      style={[
        styles.card,
        { borderLeftColor: statusConfig.color },
      ]}
      onPress={handlePress}
    >
      <View style={styles.elderInfo}>
        {elder.photo_url ? (
          <Image source={{ uri: elder.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitials}>
              {elder.first_name[0]}{elder.last_name[0]}
            </Text>
          </View>
        )}

        <View style={styles.details}>
          <Text style={styles.elderName}>
            {elder.first_name} {elder.last_name}
          </Text>

          <View style={styles.timeRow}>
            <ClockIcon size={16} color="#6B7280" />
            <Text style={styles.timeText}>
              {formatTime(start_time)} - {formatTime(end_time)}
            </Text>
          </View>

          <View style={styles.addressRow}>
            <MapPinIcon size={16} color="#6B7280" />
            <Text style={styles.addressText} numberOfLines={1}>
              {elder.address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.taskCount}>
          <TaskIcon size={16} color="#6B7280" />
          <Text style={styles.taskCountText}>{task_count} tasks</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <StatusIcon size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  elderInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoInitials: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  elderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  taskCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### Step 4: Empty Schedule Component

```typescript
// components/schedule/EmptySchedule.tsx
import { View, Text, StyleSheet } from 'react-native';
import { CalendarIcon } from '@/components/icons';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface Props {
  date: Date;
}

export function EmptySchedule({ date }: Props) {
  const getMessage = () => {
    if (isToday(date)) {
      return "No visits scheduled for today";
    } else if (isTomorrow(date)) {
      return "No visits scheduled for tomorrow";
    } else if (isPast(date)) {
      return `No visits were scheduled for ${format(date, 'EEEE')}`;
    } else {
      return `No visits scheduled for ${format(date, 'EEEE')}`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <CalendarIcon size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.message}>{getMessage()}</Text>
      <Text style={styles.subMessage}>
        Pull down to refresh or select another day
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
```

### Step 5: Real-time Schedule Updates

```typescript
// hooks/useScheduleSubscription.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  caregiverId: string;
  onUpdate: () => void;
}

export function useScheduleSubscription({ caregiverId, onUpdate }: Props) {
  useEffect(() => {
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `caregiver_id=eq.${caregiverId}`,
        },
        (payload) => {
          // Refresh schedule when assignments change
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caregiverId, onUpdate]);
}
```

## Accessibility Features

```typescript
// Large touch targets (minimum 56x56)
// High contrast colors
// Screen reader labels on all interactive elements

<Pressable
  style={styles.dayButton}
  onPress={() => handleDayPress(day.date)}
  accessibilityRole="button"
  accessibilityLabel={`${day.dayName} ${day.dayNumber}, ${day.assignmentCount} assignments`}
  accessibilityState={{ selected: isSelected }}
>
```

## Troubleshooting

### Schedule not updating
**Cause:** Real-time subscription not active
**Solution:** Check Supabase realtime is enabled and subscription is properly set up

### Wrong timezone for times
**Cause:** Server returns UTC times
**Solution:** Parse times with date-fns and display in local timezone

### Pull to refresh not working
**Cause:** ScrollView configuration
**Solution:** Ensure RefreshControl is properly connected to state
