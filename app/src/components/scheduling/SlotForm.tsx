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
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';
import { XIcon } from '@/components/icons';

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
            <XIcon color={colors.text.tertiary} />
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
                trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                thumbColor={form.is_recurring ? colors.primary[500] : colors.neutral[100]}
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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[2],
  },
  content: {
    flex: 1,
    padding: layout.screenPadding,
  },
  dateLabel: {
    ...typography.styles.body,
    color: colors.primary[500],
    fontWeight: '600',
    marginBottom: spacing[6],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  },
  timePicker: {
    height: 180,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
  },
  timeOption: {
    paddingVertical: spacing[3],
    paddingHorizontal: layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  timeOptionSelected: {
    backgroundColor: colors.primary[500],
  },
  timeOptionText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  timeDivider: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing[10],
  },
  durationText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  durationTextError: {
    color: colors.error[500],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchDescription: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: layout.screenPadding,
  },
  dayButton: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    minWidth: 48,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary[500],
  },
  dayButtonText: {
    ...typography.styles.bodySmall,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  dayButtonTextSelected: {
    color: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: layout.screenPadding,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  actionButton: {
    flex: 1,
  },
});
