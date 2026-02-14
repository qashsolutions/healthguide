// HealthGuide Week Calendar Component
// Navigation strip for scheduling view

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

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

function ChevronLeftIcon({ size = 20, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m15 18-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ size = 20, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m9 18 6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
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
          <ChevronLeftIcon />
        </Pressable>
        <Text style={styles.weekLabel}>
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </Text>
        <Pressable onPress={handleNextWeek} style={styles.navButton}>
          <ChevronRightIcon />
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  day: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 44,
  },
  daySelected: {
    backgroundColor: '#3B82F6',
  },
  dayToday: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  dayName: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayNameSelected: {
    color: '#FFFFFF',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  dayNumberToday: {
    color: '#3B82F6',
  },
  slotIndicator: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  slotIndicatorSelected: {
    backgroundColor: '#FFFFFF',
  },
  slotCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  slotCountSelected: {
    color: '#3B82F6',
  },
});
