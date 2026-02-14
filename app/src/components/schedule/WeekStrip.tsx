// HealthGuide Caregiver Week Strip Component
// Horizontal day selector with assignment indicators

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
  }, [selectedDate, caregiverId]);

  async function generateWeekDays() {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday start
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

    try {
      const { data } = await supabase
        .from('visits')
        .select('scheduled_date')
        .eq('caregiver_id', caregiverId)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((a) => {
          const dateKey = a.scheduled_date?.split('T')[0];
          if (dateKey) {
            counts[dateKey] = (counts[dateKey] || 0) + 1;
          }
        });

        weekDays.forEach((day) => {
          const dateStr = format(day.date, 'yyyy-MM-dd');
          day.assignmentCount = counts[dateStr] || 0;
          day.hasAssignments = day.assignmentCount > 0;
        });
      }
    } catch (error) {
      console.error('Error fetching week data:', error);
    }

    setDays(weekDays);
  }

  const handleDayPress = (date: Date) => {
    Haptics.selectionAsync();
    onDateSelect(date);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.monthYear}>{format(selectedDate, 'MMMM yyyy')}</Text>

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
              accessibilityRole="button"
              accessibilityLabel={`${day.dayName} ${day.dayNumber}, ${day.assignmentCount} visits`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[styles.dayName, isSelected && styles.dayTextSelected]}
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
                  style={[styles.dot, isSelected && styles.dotSelected]}
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
    color: '#1F2937',
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
