// HealthGuide Slot Creation/Edit Form
// Modal for creating and editing time slots

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Switch,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import Svg, { Path } from 'react-native-svg';

interface Props {
  visible: boolean;
  onClose: () => void;
  date: Date;
  onSave: () => void;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

function CloseIcon({ size = 24, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6 6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, 'h:mm a');
}

function calculateDuration(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

export function SlotForm({ visible, onClose, date, onSave }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    start_time: '09:00',
    end_time: '12:00',
    is_recurring: false,
    recurrence_days: [] as number[],
  });

  const duration = calculateDuration(form.start_time, form.end_time);
  const isValidDuration = duration >= 60; // Minimum 1 hour

  function toggleRecurrenceDay(day: number) {
    setForm((prev) => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day],
    }));
  }

  async function handleCreate() {
    if (!isValidDuration) {
      Alert.alert('Invalid Duration', 'Minimum booking duration is 1 hour.');
      return;
    }

    if (form.is_recurring && form.recurrence_days.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day for recurring slots.');
      return;
    }

    setLoading(true);

    try {
      if (form.is_recurring) {
        // Create recurring slots via Edge Function
        const { error } = await supabase.functions.invoke('create-recurring-slots', {
          body: {
            agency_id: user?.user_metadata?.agency_id,
            start_date: format(date, 'yyyy-MM-dd'),
            start_time: form.start_time,
            end_time: form.end_time,
            days_of_week: form.recurrence_days,
            weeks: 12, // 12 weeks of recurring slots
          },
        });

        if (error) throw error;
      } else {
        // Create single slot
        const { error } = await supabase.from('time_slots').insert({
          agency_id: user?.user_metadata?.agency_id,
          date: format(date, 'yyyy-MM-dd'),
          start_time: form.start_time,
          end_time: form.end_time,
          status: 'available',
          is_recurring: false,
        });

        if (error) throw error;
      }

      onSave();
      onClose();
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create slot');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      start_time: '09:00',
      end_time: '12:00',
      is_recurring: false,
      recurrence_days: [],
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Time Slot</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.dateLabel}>
            {format(date, 'EEEE, MMMM d, yyyy')}
          </Text>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time</Text>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Start</Text>
                <ScrollView
                  style={styles.timePicker}
                  showsVerticalScrollIndicator={false}
                >
                  {TIME_OPTIONS.map((time) => (
                    <Pressable
                      key={time}
                      style={[
                        styles.timeOption,
                        form.start_time === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setForm({ ...form, start_time: time })}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          form.start_time === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {formatTimeForDisplay(time)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeDivider}>to</Text>

              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>End</Text>
                <ScrollView
                  style={styles.timePicker}
                  showsVerticalScrollIndicator={false}
                >
                  {TIME_OPTIONS.map((time) => (
                    <Pressable
                      key={time}
                      style={[
                        styles.timeOption,
                        form.end_time === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setForm({ ...form, end_time: time })}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          form.end_time === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {formatTimeForDisplay(time)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Duration indicator */}
            <Text
              style={[
                styles.durationText,
                !isValidDuration && styles.durationTextError,
              ]}
            >
              Duration: {Math.floor(duration / 60)}h {duration % 60}m
              {!isValidDuration && ' (minimum 1 hour)'}
            </Text>
          </View>

          {/* Recurring Toggle */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.sectionTitle}>Recurring Weekly</Text>
                <Text style={styles.switchDescription}>
                  Create this slot for the next 12 weeks
                </Text>
              </View>
              <Switch
                value={form.is_recurring}
                onValueChange={(value) =>
                  setForm({ ...form, is_recurring: value })
                }
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={form.is_recurring ? '#3B82F6' : '#F3F4F6'}
              />
            </View>

            {/* Day Selection */}
            {form.is_recurring && (
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => (
                  <Pressable
                    key={day.value}
                    style={[
                      styles.dayButton,
                      form.recurrence_days.includes(day.value) &&
                        styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleRecurrenceDay(day.value)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        form.recurrence_days.includes(day.value) &&
                          styles.dayButtonTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.actionButton}
          />
          <Button
            title={form.is_recurring ? 'Create Recurring Slots' : 'Create Slot'}
            onPress={handleCreate}
            loading={loading}
            disabled={!isValidDuration}
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateLabel: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  timePicker: {
    height: 180,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeOptionSelected: {
    backgroundColor: '#3B82F6',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeDivider: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 40,
  },
  durationText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  durationTextError: {
    color: '#EF4444',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minWidth: 48,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
  },
});
