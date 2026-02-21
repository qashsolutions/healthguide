// HealthGuide — Recurring Visit Setup
// After accepting a visit, companion can make it recurring
// Sets frequency, days, end condition, then generates child visits

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { CheckIcon, CalendarIcon, ClockIcon } from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  buildRecurrenceRule,
  generateChildVisits,
  getDayFromDateString,
} from '@/lib/recurringVisits';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

type Frequency = 'weekly' | 'biweekly';
type EndType = 'none' | 'after_count' | 'end_date';

export default function RecurringSetupScreen() {
  const router = useRouter();
  const { visitId, elderName, visitDate, visitTime, visitTasks } = useLocalSearchParams<{
    visitId: string;
    elderName?: string;
    visitDate?: string;
    visitTime?: string;
    visitTasks?: string;
  }>();

  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    if (visitDate) {
      const day = getDayFromDateString(visitDate);
      return [day];
    }
    return [];
  });
  const [endType, setEndType] = useState<EndType>('after_count');
  const [endCount, setEndCount] = useState('8');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleConfirm() {
    if (selectedDays.length === 0) {
      const msg = 'Please select at least one day.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Missing Days', msg);
      return;
    }

    setSaving(true);

    try {
      // 1. Build recurrence rule and update parent visit
      const rule = buildRecurrenceRule({
        frequency,
        days: selectedDays,
        endType,
        endAfterCount: endType === 'after_count' ? parseInt(endCount) || 8 : undefined,
      });

      const { error: updateError } = await supabase
        .from('visits')
        .update({
          is_recurring: true,
          recurrence_rule: rule,
        })
        .eq('id', visitId);

      if (updateError) throw updateError;

      // 2. Generate child visits
      const result = await generateChildVisits(visitId!);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate visits');
      }

      setGeneratedCount(result.count);
      setSuccess(true);

      // Auto-navigate after delay
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err: any) {
      const msg = err.message || 'Could not set up recurring visits';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <>
        <Stack.Screen options={{ title: 'Recurring Visit', headerShown: true, headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.successContainer}>
            <View style={styles.successCircle}>
              <CheckIcon size={64} color={colors.white} />
            </View>
            <Text style={styles.successTitle}>Recurring visits created!</Text>
            <Text style={styles.successSubtitle}>
              {generatedCount} upcoming visit{generatedCount !== 1 ? 's' : ''} added to your schedule
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Make Recurring', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Visit summary */}
          {(elderName || visitDate) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {elderName ? `Visit with ${elderName}` : 'Visit'}
              </Text>
              {visitDate && (
                <Text style={styles.summaryDetail}>
                  {visitDate}{visitTime ? ` at ${visitTime}` : ''}
                </Text>
              )}
              {visitTasks && (
                <Text style={styles.summaryDetail}>{visitTasks}</Text>
              )}
            </View>
          )}

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Repeat</Text>
            <View style={styles.optionRow}>
              <Pressable
                style={[styles.optionPill, frequency === 'weekly' && styles.optionPillActive]}
                onPress={() => setFrequency('weekly')}
              >
                <Text style={[styles.optionPillText, frequency === 'weekly' && styles.optionPillTextActive]}>
                  Every week
                </Text>
              </Pressable>
              <Pressable
                style={[styles.optionPill, frequency === 'biweekly' && styles.optionPillActive]}
                onPress={() => setFrequency('biweekly')}
              >
                <Text style={[styles.optionPillText, frequency === 'biweekly' && styles.optionPillTextActive]}>
                  Every 2 weeks
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>On days</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const active = selectedDays.includes(day.key);
                return (
                  <Pressable
                    key={day.key}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                    onPress={() => toggleDay(day.key)}
                  >
                    <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* End condition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Until</Text>

            <Pressable
              style={styles.radioRow}
              onPress={() => setEndType('none')}
            >
              <View style={[styles.radio, endType === 'none' && styles.radioActive]}>
                {endType === 'none' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>No end date (generates 4 weeks ahead)</Text>
            </Pressable>

            <Pressable
              style={styles.radioRow}
              onPress={() => setEndType('after_count')}
            >
              <View style={[styles.radio, endType === 'after_count' && styles.radioActive]}>
                {endType === 'after_count' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>End after</Text>
              <TextInput
                style={styles.countInput}
                value={endCount}
                onChangeText={(t) => setEndCount(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={2}
                editable={endType === 'after_count'}
              />
              <Text style={styles.radioLabel}>visits</Text>
            </Pressable>
          </View>

          {/* Preview */}
          <View style={styles.previewSection}>
            <CalendarIcon size={18} color={colors.text.secondary} />
            <Text style={styles.previewText}>
              {frequency === 'weekly' ? 'Every' : 'Every other'}{' '}
              {selectedDays.length > 0
                ? selectedDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')
                : '(select days)'}
              {visitTime ? ` at ${visitTime}` : ''}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.skipLink}
            onPress={() => router.back()}
          >
            <Text style={styles.skipText}>Skip — one-time visit</Text>
          </Pressable>
          <Button
            title={saving ? 'Setting up...' : 'Confirm Recurring'}
            onPress={handleConfirm}
            disabled={saving || selectedDays.length === 0}
            loading={saving}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </>
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  successTitle: {
    ...typography.caregiver.heading,
    color: colors.success[600],
    marginBottom: spacing[2],
  },
  successSubtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: roleColors.caregiver,
    marginBottom: spacing[6],
  },
  summaryTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  summaryDetail: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },

  // Sections
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },

  // Frequency pills
  optionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  optionPill: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  optionPillActive: {
    borderColor: roleColors.caregiver,
    backgroundColor: roleColors.caregiver + '10',
  },
  optionPillText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  optionPillTextActive: {
    color: roleColors.caregiver,
  },

  // Days
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  dayPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillActive: {
    borderColor: roleColors.caregiver,
    backgroundColor: roleColors.caregiver,
  },
  dayPillText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  dayPillTextActive: {
    color: colors.white,
  },

  // Radio buttons
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: roleColors.caregiver,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: roleColors.caregiver,
  },
  radioLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  countInput: {
    ...typography.styles.body,
    width: 44,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    color: colors.text.primary,
  },

  // Preview
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  previewText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // Bottom bar
  bottomBar: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  skipText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
