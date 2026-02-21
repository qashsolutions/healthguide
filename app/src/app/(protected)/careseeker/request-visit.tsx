// HealthGuide Visit Request Screen
// Elder/family picks date, time slot, tasks, and sends request to a companion
// Route param: companionId (from directory or companion detail)

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { CheckIcon, PersonIcon, StudentIcon, CompanionIcon } from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ALLOWED_TASKS } from '@/constants/tasks';
import { format, addDays } from 'date-fns';

const TIME_SLOTS = [
  { label: '6-8a', value: '6am-8am' },
  { label: '8-10a', value: '8am-10am' },
  { label: '10-12p', value: '10am-12pm' },
  { label: '12-2p', value: '12pm-2pm' },
  { label: '2-4p', value: '2pm-4pm' },
  { label: '4-6p', value: '4pm-6pm' },
  { label: '6-8p', value: '6pm-8pm' },
  { label: '8-10p', value: '8pm-10pm' },
];

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDayKey(date: Date): string {
  return DAY_KEYS[date.getDay()];
}

// Generate next 14 days starting tomorrow
function generateDateOptions(): { date: Date; label: string; value: string }[] {
  const options: { date: Date; label: string; value: string }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = addDays(new Date(), i);
    options.push({
      date: d,
      label: format(d, 'EEE, MMM d'),
      value: format(d, 'yyyy-MM-dd'),
    });
  }
  return options;
}

interface CompanionInfo {
  id: string;
  user_id: string;
  full_name: string;
  caregiver_type: string;
  availability: Record<string, string[]> | null;
  capabilities: string[];
}

export default function RequestVisitScreen() {
  const router = useRouter();
  const { companionId } = useLocalSearchParams<{ companionId: string }>();
  const { user } = useAuth();

  const [companion, setCompanion] = useState<CompanionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>(['companionship']);
  const [note, setNote] = useState('');

  const dateOptions = generateDateOptions();

  useEffect(() => {
    if (!companionId) return;
    loadCompanion();
  }, [companionId]);

  async function loadCompanion() {
    const { data, error } = await supabase
      .from('caregiver_profiles')
      .select('id, user_id, full_name, caregiver_type, availability, capabilities')
      .eq('id', companionId)
      .single();

    if (!error && data) setCompanion(data);
    setLoading(false);
  }

  // Determine which slots the companion is available for on the selected date
  const companionSlots: string[] = (() => {
    if (!selectedDate || !companion?.availability) return [];
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayKey = getDayKey(dateObj);
    return companion.availability[dayKey] || [];
  })();

  function toggleTask(taskId: string) {
    if (selectedTasks.includes(taskId)) {
      if (selectedTasks.length === 1) return; // min 1
      setSelectedTasks(selectedTasks.filter((t) => t !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  }

  const isValid = selectedDate !== '' && selectedSlot !== '' && selectedTasks.length > 0;

  async function handleSubmit() {
    if (!isValid || !companion || !user?.id) return;

    // Check if requesting an unavailable slot
    if (companionSlots.length > 0 && !companionSlots.includes(selectedSlot)) {
      const proceed = await new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm(
            `${companion.full_name.split(' ')[0]} hasn't marked this time as available. Send request anyway?`
          ));
        } else {
          Alert.alert(
            'Time Not Available',
            `${companion.full_name.split(' ')[0]} hasn't marked this time as available. They may still accept — would you like to request anyway?`,
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Send Anyway', onPress: () => resolve(true) },
            ]
          );
        }
      });
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      // Get elder_id for the current user
      const { data: elderData } = await supabase
        .from('elders')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // If user is family member, look up their elder
      let elderId = elderData?.id;
      let elderName = elderData ? `${elderData.first_name} ${elderData.last_name}` : '';
      if (!elderId) {
        const { data: familyData } = await supabase
          .from('family_members')
          .select('elder_id, elder:elders(id, first_name, last_name)')
          .eq('user_id', user.id)
          .eq('invite_status', 'accepted')
          .maybeSingle();

        if (familyData) {
          const elder = Array.isArray(familyData.elder) ? familyData.elder[0] : familyData.elder;
          elderId = elder?.id || familyData.elder_id;
          elderName = elder ? `${elder.first_name} ${elder.last_name}` : '';
        }
      }

      if (!elderId) {
        throw new Error('Could not determine elder for this request');
      }

      const { data: request, error } = await supabase
        .from('visit_requests')
        .insert({
          elder_id: elderId,
          companion_id: companion.user_id,
          requested_by: user.id,
          requested_date: selectedDate,
          requested_time_slot: selectedSlot,
          tasks: selectedTasks,
          note: note.trim() || null,
          is_auto_match: false,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Try to send notification (non-blocking)
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: companion.user_id,
            title: 'New Visit Request',
            body: `${elderName} would like a visit on ${format(new Date(selectedDate + 'T12:00:00'), 'MMM d')}`,
            data: { type: 'visit_request', requestId: request.id },
          },
        });
      } catch {
        // Notification failure is non-critical
      }

      setSubmitted(true);
    } catch (err: any) {
      const msg = err.message || 'Could not send request';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ title: 'Request Sent', headerShown: true, headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <CheckIcon size={48} color={colors.white} />
            </View>
            <Text style={styles.successTitle}>Request Sent!</Text>
            <Text style={styles.successText}>
              Your visit request has been sent to {companion?.full_name?.split(' ')[0]}.
              You'll be notified when they respond.
            </Text>
            <Button
              title="View My Requests"
              onPress={() => router.replace('/(protected)/careseeker/my-requests' as any)}
              style={styles.successButton}
            />
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backLink}>Back to Directory</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (loading || !companion) {
    return (
      <>
        <Stack.Screen options={{ title: 'Request Visit', headerShown: true, headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Companion not found'}</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const isStudent = companion.caregiver_type === 'student';

  return (
    <>
      <Stack.Screen options={{ title: 'Request a Visit', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Companion info */}
          <View style={styles.companionRow}>
            <View style={styles.companionAvatar}>
              <PersonIcon size={24} color={colors.neutral[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.companionName}>{companion.full_name}</Text>
              <View style={[styles.typeBadge, isStudent ? styles.studentBadge : styles.companionBadge]}>
                {isStudent ? (
                  <StudentIcon size={12} color={colors.white} />
                ) : (
                  <CompanionIcon size={12} color={colors.white} />
                )}
                <Text style={styles.typeBadgeText}>
                  {isStudent ? 'Student' : '55+ Companion'}
                </Text>
              </View>
            </View>
          </View>

          {/* Date selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pick a Date *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContent}
            >
              {dateOptions.map((opt) => {
                const active = selectedDate === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                    onPress={() => {
                      setSelectedDate(opt.value);
                      setSelectedSlot(''); // reset slot on date change
                    }}
                  >
                    <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Time slot selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pick a Time Slot *</Text>
            {selectedDate && companionSlots.length > 0 && (
              <Text style={styles.hintText}>
                Highlighted slots are when {companion.full_name.split(' ')[0]} is available
              </Text>
            )}
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => {
                const active = selectedSlot === slot.value;
                const isAvailable = companionSlots.includes(slot.value);
                const showAvailHint = selectedDate && companionSlots.length > 0;

                return (
                  <Pressable
                    key={slot.value}
                    style={[
                      styles.slotChip,
                      active && styles.slotChipActive,
                      showAvailHint && isAvailable && !active && styles.slotChipAvailable,
                      showAvailHint && !isAvailable && !active && styles.slotChipDimmed,
                    ]}
                    onPress={() => setSelectedSlot(slot.value)}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        active && styles.slotChipTextActive,
                        showAvailHint && !isAvailable && !active && styles.slotChipTextDimmed,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tasks selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks for this visit *</Text>
            <Text style={styles.hintText}>Select at least one</Text>
            {ALLOWED_TASKS.map((task) => {
              const isSelected = selectedTasks.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  style={[styles.taskRow, isSelected && styles.taskRowSelected]}
                  onPress={() => toggleTask(task.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <CheckIcon size={14} color={colors.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskLabel}>{task.label}</Text>
                    <Text style={styles.taskDesc}>{task.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Input
              label="Note to companion (optional)"
              placeholder="e.g. Mom loves talking about gardening..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* Submit */}
          <Button
            title="Send Request"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!isValid}
            size="lg"
            style={styles.submitButton}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },

  // Companion row
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[4],
  },
  companionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  studentBadge: { backgroundColor: '#7C3AED' },
  companionBadge: { backgroundColor: '#059669' },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },

  // Sections
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing[2],
  },
  hintText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  },

  // Date chips
  dateScrollContent: {
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  dateChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  dateChipActive: {
    backgroundColor: roleColors.careseeker,
    borderColor: roleColors.careseeker,
  },
  dateChipText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  dateChipTextActive: {
    color: colors.white,
  },

  // Slot grid
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  slotChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  slotChipActive: {
    backgroundColor: roleColors.careseeker,
    borderColor: roleColors.careseeker,
  },
  slotChipAvailable: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[300],
  },
  slotChipDimmed: {
    opacity: 0.5,
  },
  slotChipText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  slotChipTextActive: {
    color: colors.white,
  },
  slotChipTextDimmed: {
    color: colors.text.tertiary,
  },

  // Tasks
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[2],
  },
  taskRowSelected: {
    backgroundColor: roleColors.careseeker + '10',
    borderColor: roleColors.careseeker,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: roleColors.careseeker,
    borderColor: roleColors.careseeker,
  },
  taskLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  taskDesc: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Submit
  submitButton: {
    width: '100%',
    marginTop: spacing[2],
  },

  // Success
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  successTitle: {
    ...typography.styles.h2,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  successText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  successButton: {
    minWidth: 200,
    marginBottom: spacing[3],
  },
  backLink: {
    ...typography.styles.body,
    color: colors.primary[500],
    fontWeight: '600',
    paddingVertical: spacing[2],
  },
});
