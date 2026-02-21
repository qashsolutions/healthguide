// HealthGuide Student Profile Setup
// Completes caregiver_profiles for student companions
// Shows after signup when profile_completed = false

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { ScopeAlert } from '@/components/ScopeAlert';
import { CheckIcon, ArrowLeftIcon } from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ALLOWED_TASKS } from '@/constants/tasks';
import * as ImagePicker from 'expo-image-picker';

const STUDENT_COLOR = '#7C3AED';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

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

const TRAVEL_OPTIONS = [
  { label: '5 mi', value: 5 },
  { label: '10 mi', value: 10 },
  { label: '25 mi', value: 25 },
];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const LANGUAGE_OPTIONS = [
  'english', 'spanish', 'mandarin', 'cantonese', 'tagalog',
  'vietnamese', 'korean', 'hindi', 'arabic', 'french',
  'portuguese', 'russian', 'japanese', 'haitian_creole', 'other',
];

const LANGUAGE_LABELS: Record<string, string> = {
  english: 'English', spanish: 'Spanish', mandarin: 'Mandarin',
  cantonese: 'Cantonese', tagalog: 'Tagalog', vietnamese: 'Vietnamese',
  korean: 'Korean', hindi: 'Hindi', arabic: 'Arabic', french: 'French',
  portuguese: 'Portuguese', russian: 'Russian', japanese: 'Japanese',
  haitian_creole: 'Haitian Creole', other: 'Other',
};

export default function ProfileSetupStudentScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showScope, setShowScope] = useState(false);

  const [form, setForm] = useState({
    photoUri: null as string | null,
    homeZip: '',
    travelRadius: 10,
    gender: '',
    bio: '',
    programName: '',
    gradYear: '',
    selectedTasks: ['companionship'] as string[],
    selectedLanguages: ['english'] as string[],
    availability: {} as Record<string, string[]>,
  });

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setForm({ ...form, photoUri: result.assets[0].uri });
      }
    } catch {
      // Silently fail on web
    }
  }

  function toggleDay(day: string) {
    const current = form.availability[day];
    if (current && current.length > 0) {
      // Remove all slots for this day
      const updated = { ...form.availability };
      delete updated[day];
      setForm({ ...form, availability: updated });
    } else {
      // Add default morning slots
      setForm({
        ...form,
        availability: { ...form.availability, [day]: ['8am-10am', '10am-12pm'] },
      });
    }
  }

  function toggleTimeSlot(day: string, slot: string) {
    const daySlots = form.availability[day] || [];
    if (daySlots.includes(slot)) {
      const updated = daySlots.filter((s) => s !== slot);
      setForm({
        ...form,
        availability: {
          ...form.availability,
          [day]: updated,
        },
      });
    } else {
      setForm({
        ...form,
        availability: {
          ...form.availability,
          [day]: [...daySlots, slot],
        },
      });
    }
  }

  function toggleTask(taskId: string) {
    const current = form.selectedTasks;
    if (current.includes(taskId)) {
      if (current.length === 1) return; // min 1
      setForm({ ...form, selectedTasks: current.filter((t) => t !== taskId) });
    } else {
      setForm({ ...form, selectedTasks: [...current, taskId] });
    }
  }

  function toggleLanguage(lang: string) {
    const current = form.selectedLanguages;
    if (current.includes(lang)) {
      setForm({ ...form, selectedLanguages: current.filter((l) => l !== lang) });
    } else {
      setForm({ ...form, selectedLanguages: [...current, lang] });
    }
  }

  const isValid =
    form.homeZip.length === 5 &&
    form.gender !== '' &&
    form.selectedTasks.length > 0 &&
    Object.keys(form.availability).length > 0;

  async function handleComplete() {
    if (!isValid || !user?.id) return;

    setLoading(true);
    try {
      // Upload photo if provided
      let photoUrl = null;
      if (form.photoUri) {
        const photoName = `${user.id}_${Date.now()}.jpg`;
        const response = await fetch(form.photoUri);
        const blob = await response.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`caregiver/${user.id}/${photoName}`, blob);
        if (!uploadError && uploadData) {
          photoUrl = uploadData.path;
        }
      }

      // Get college info from auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata || {};

      // Check if profile already exists (upsert)
      const { data: existing } = await supabase
        .from('caregiver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const profileData = {
        user_id: user.id,
        full_name: meta.full_name || user.full_name || '',
        phone: meta.phone || user.phone || '',
        email: authUser?.email || user.email || '',
        caregiver_type: 'student' as const,
        gender: form.gender,
        college_name: meta.college_name || '',
        college_city: meta.college_city || '',
        college_state: meta.college_state || '',
        college_zip: meta.college_zip || '',
        edu_email: authUser?.email || '',
        zip_code: form.homeZip,
        travel_radius_miles: form.travelRadius,
        availability: form.availability,
        capabilities: form.selectedTasks,
        languages: form.selectedLanguages,
        bio: form.bio || null,
        program_name: form.programName || null,
        expected_graduation_year: form.gradYear ? parseInt(form.gradYear) : null,
        is_independent: true,
        photo_url: photoUrl,
        profile_completed: true,
        is_active: true,
      };

      if (existing) {
        const { error } = await supabase
          .from('caregiver_profiles')
          .update(profileData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('caregiver_profiles')
          .insert(profileData);
        if (error) throw error;
      }

      // Show scope alert
      setShowScope(true);
    } catch (err: any) {
      const msg = err.message || 'Could not complete profile';
      if (Platform.OS === 'web') {
        console.error(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleScopeAccepted() {
    setShowScope(false);
    refreshProfile();
    router.replace('/(protected)/caregiver/(tabs)' as any);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Photo</Text>
            <Pressable onPress={handlePickImage} style={styles.photoButton}>
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Home Zip + Travel Radius */}
          <View style={styles.section}>
            <Input
              label="Home Zip Code *"
              placeholder="28202"
              value={form.homeZip}
              onChangeText={(t: string) => {
                const cleaned = t.replace(/\D/g, '').slice(0, 5);
                setForm({ ...form, homeZip: cleaned });
              }}
              keyboardType="numeric"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>Travel Radius *</Text>
            <View style={styles.segmentedRow}>
              {TRAVEL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.segmentButton,
                    form.travelRadius === opt.value && styles.segmentButtonActive,
                  ]}
                  onPress={() => setForm({ ...form, travelRadius: opt.value })}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      form.travelRadius === opt.value && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability *</Text>
            <Text style={styles.sectionHint}>Select days, then choose time slots</Text>

            {/* Day pills */}
            <View style={styles.pillRow}>
              {DAYS.map((day) => {
                const isActive = (form.availability[day.key] || []).length > 0;
                return (
                  <Pressable
                    key={day.key}
                    style={[styles.dayPill, isActive && styles.dayPillActive]}
                    onPress={() => toggleDay(day.key)}
                  >
                    <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Time slots for selected days */}
            {DAYS.filter((d) => (form.availability[d.key] || []).length > 0 || form.availability[d.key] !== undefined).map((day) => {
              const daySlots = form.availability[day.key];
              if (!daySlots) return null;
              return (
                <View key={`slots-${day.key}`} style={styles.daySlotSection}>
                  <Text style={styles.daySlotLabel}>{day.label}</Text>
                  <View style={styles.pillRow}>
                    {TIME_SLOTS.map((slot) => {
                      const isActive = daySlots.includes(slot.value);
                      return (
                        <Pressable
                          key={slot.value}
                          style={[styles.timePill, isActive && styles.timePillActive]}
                          onPress={() => toggleTimeSlot(day.key, slot.value)}
                        >
                          <Text style={[styles.timePillText, isActive && styles.timePillTextActive]}>
                            {slot.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Tasks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks I Can Help With *</Text>
            <Text style={styles.sectionHint}>Select at least one</Text>
            {ALLOWED_TASKS.map((task) => {
              const isSelected = form.selectedTasks.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  style={[styles.taskRow, isSelected && styles.taskRowSelected]}
                  onPress={() => toggleTask(task.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <CheckIcon size={14} color={colors.white} />}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskLabel}>{task.label}</Text>
                    <Text style={styles.taskDesc}>{task.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages Spoken</Text>
            <View style={styles.pillRow}>
              {LANGUAGE_OPTIONS.map((lang) => {
                const isActive = form.selectedLanguages.includes(lang);
                return (
                  <Pressable
                    key={lang}
                    style={[styles.langPill, isActive && styles.langPillActive]}
                    onPress={() => toggleLanguage(lang)}
                  >
                    <Text style={[styles.langPillText, isActive && styles.langPillTextActive]}>
                      {LANGUAGE_LABELS[lang] || lang}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender *</Text>
            <View style={styles.segmentedRow}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.segmentButton,
                    form.gender === opt.value && styles.segmentButtonActive,
                  ]}
                  onPress={() => setForm({ ...form, gender: opt.value })}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      form.gender === opt.value && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Bio + Optional fields */}
          <View style={styles.section}>
            <Input
              label="Short Bio"
              placeholder="Tell elders a bit about yourself..."
              value={form.bio}
              onChangeText={(t: string) => setForm({ ...form, bio: t })}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Input
              label="Program Name"
              placeholder="e.g. BSN Nursing"
              value={form.programName}
              onChangeText={(t: string) => setForm({ ...form, programName: t })}
            />

            <Input
              label="Expected Graduation Year"
              placeholder="2027"
              value={form.gradYear}
              onChangeText={(t: string) => {
                const cleaned = t.replace(/\D/g, '').slice(0, 4);
                setForm({ ...form, gradYear: cleaned });
              }}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          {/* Submit */}
          <View style={styles.actions}>
            <Button
              title="Complete Profile"
              onPress={handleComplete}
              loading={loading}
              disabled={!isValid}
              size="lg"
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ScopeAlert
        visible={showScope}
        onAccept={handleScopeAccepted}
        context="onboarding"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  section: {
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  sectionHint: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: -spacing[2],
  },
  fieldLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[2],
  },

  // Photo
  photoButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral[100],
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Segmented controls
  segmentedRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing[2.5] || 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: STUDENT_COLOR,
    borderColor: STUDENT_COLOR,
  },
  segmentText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.white,
  },

  // Day pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  dayPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  dayPillActive: {
    backgroundColor: STUDENT_COLOR,
    borderColor: STUDENT_COLOR,
  },
  dayPillText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  dayPillTextActive: {
    color: colors.white,
  },

  // Time slots
  daySlotSection: {
    marginTop: spacing[1],
  },
  daySlotLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  timePill: {
    paddingHorizontal: spacing[2.5] || 10,
    paddingVertical: spacing[1.5] || 6,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  timePillActive: {
    backgroundColor: STUDENT_COLOR + '20',
    borderColor: STUDENT_COLOR,
  },
  timePillText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  timePillTextActive: {
    color: STUDENT_COLOR,
    fontWeight: '600',
  },

  // Task checkboxes
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  taskRowSelected: {
    backgroundColor: STUDENT_COLOR + '10',
    borderColor: STUDENT_COLOR,
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
    backgroundColor: STUDENT_COLOR,
    borderColor: STUDENT_COLOR,
  },
  taskInfo: {
    flex: 1,
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

  // Language pills
  langPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5] || 6,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  langPillActive: {
    backgroundColor: STUDENT_COLOR + '15',
    borderColor: STUDENT_COLOR,
  },
  langPillText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  langPillTextActive: {
    color: STUDENT_COLOR,
    fontWeight: '600',
  },

  // Actions
  actions: {
    marginTop: spacing[4],
  },
  submitButton: {
    width: '100%',
    backgroundColor: STUDENT_COLOR,
  },
});
