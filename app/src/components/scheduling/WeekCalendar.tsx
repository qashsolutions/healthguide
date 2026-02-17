// HealthGuide Week Calendar Component
// Navigation strip for scheduling view

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';
import { ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight } from '@/components/icons';

interface TimeSlot {
  id: string;
  date: string;
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
}

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  slots?: TimeSlot[];
}

export function WeekCalendar({ selectedDate, onSelectDate, slots = [] }: Props) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getSlotCountForDay(date: Date): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter((s) => s.date === dateStr).length;
  }

  function handlePrevWeek() {
    Haptics.selectionAsync();
    onSelectDate(addDays(selectedDate, -7));
  }

  function handleNextWeek() {
    Haptics.selectionAsync();
    onSelectDate(addDays(selectedDate, 7));
  }

  function handleDayPress(date: Date) {
    Haptics.selectionAsync();
    onSelectDate(date);
  }

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <Pressable onPress={handlePrevWeek} style={styles.navButton}>
          <ChevronLeft color={colors.primary[500]} size={20} />
        </Pressable>
        <Text style={styles.weekLabel}>
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </Text>
        <Pressable onPress={handleNextWeek} style={styles.navButton}>
          <ChevronRight color={colors.primary[500]} size={20} />
        </Pressable>
      </View>

      {/* Days */}
      <View style={styles.days}>
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const slotCount = getSlotCountForDay(day);

          return (
            <Pressable
              key={day.toISOString()}
              style={[
                styles.day,
                isSelected && styles.daySelected,
                today && !isSelected && styles.dayToday,
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                ]}
              >
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  today && !isSelected && styles.dayNumberToday,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {slotCount > 0 && (
                <View
                  style={[
                    styles.slotIndicator,
                    isSelected && styles.slotIndicatorSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotCount,
                      isSelected && styles.slotCountSelected,
                    ]}
                  >
                    {slotCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing[3],
  },
  navButton: {
    padding: spacing[2],
  },
  weekLabel: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    color: colors.text.primary,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[2],
  },
  day: {
    alignItems: 'center',
    padding: spacing[2],
    borderRadius: borderRadius.lg,
    minWidth: 44,
  },
  daySelected: {
    backgroundColor: colors.primary[500],
  },
  dayToday: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  dayName: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  dayNameSelected: {
    color: colors.surface,
  },
  dayNumber: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  dayNumberSelected: {
    color: colors.surface,
  },
  dayNumberToday: {
    color: colors.primary[500],
  },
  slotIndicator: {
    backgroundColor: colors.success[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    marginTop: spacing[1],
  },
  slotIndicatorSelected: {
    backgroundColor: colors.surface,
  },
  slotCount: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: '600',
  },
  slotCountSelected: {
    color: colors.primary[500],
  },
});
