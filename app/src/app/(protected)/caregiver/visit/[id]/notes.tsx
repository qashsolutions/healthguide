// HealthGuide Observations/Notes Screen
// Per healthguide-caregiver/observations skill - Icon-based observations with voice

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ObservationCategory } from '@/components/caregiver/ObservationCategory';
import { VoiceNoteButton } from '@/components/caregiver/VoiceNoteButton';
import { TapButton } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CheckIcon, ArrowLeftIcon, XIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Observation {
  category: string;
  value: string;
  icon: string;
}

interface ElderInfo {
  id: string;
  first_name: string;
  last_name: string;
}

// Observation options per skill definition
const MOOD_OPTIONS = [
  { value: 'happy', label: 'Happy', icon: 'mood_happy' },
  { value: 'calm', label: 'Calm', icon: 'mood_calm' },
  { value: 'quiet', label: 'Quiet', icon: 'mood_quiet' },
  { value: 'confused', label: 'Confused', icon: 'mood_confused' },
  { value: 'anxious', label: 'Anxious', icon: 'mood_anxious' },
];

const APPETITE_OPTIONS = [
  { value: 'ate_well', label: 'Ate Well', icon: 'appetite_good' },
  { value: 'ate_some', label: 'Ate Some', icon: 'appetite_some' },
  { value: 'ate_little', label: 'Ate Little', icon: 'appetite_little' },
  { value: 'no_appetite', label: 'No Appetite', icon: 'appetite_none' },
];

const MOBILITY_OPTIONS = [
  { value: 'walking_well', label: 'Walking Well', icon: 'mobility_good' },
  { value: 'slower_than_usual', label: 'Slower', icon: 'mobility_slow' },
  { value: 'needed_assistance', label: 'Needed Help', icon: 'mobility_help' },
  { value: 'stayed_seated', label: 'Stayed Seated', icon: 'mobility_seated' },
];

const ACTIVITY_OPTIONS = [
  { value: 'active', label: 'Active', icon: 'activity_high' },
  { value: 'moderate', label: 'Moderate', icon: 'activity_medium' },
  { value: 'resting', label: 'Resting', icon: 'activity_low' },
  { value: 'sleeping', label: 'Sleeping', icon: 'activity_sleep' },
];

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elderInfo, setElderInfo] = useState<ElderInfo | null>(null);

  // Fetch elder info
  const fetchElderInfo = useCallback(async () => {
    if (!id) return;

    const { data } = await supabase
      .from('visits')
      .select(`
        elder:elders (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single();

    if (data?.elder) {
      // Transform Supabase join (array) to object
      const elderData = Array.isArray(data.elder) ? data.elder[0] : data.elder;
      setElderInfo(elderData);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchElderInfo();
  }, [fetchElderInfo]);

  const clientName = elderInfo?.first_name || 'Client';

  function handleSelectObservation(category: string, value: string, icon: string) {
    hapticFeedback('light');

    // Toggle or replace selection in category
    const exists = observations.find(
      (o) => o.category === category && o.value === value
    );

    if (exists) {
      // Deselect
      setObservations(observations.filter(
        (o) => !(o.category === category && o.value === value)
      ));
    } else {
      // Replace previous selection in same category
      setObservations([
        ...observations.filter((o) => o.category !== category),
        { category, value, icon },
      ]);
    }
  }

  function handleVoiceNote(transcript: string) {
    if (transcript.trim()) {
      hapticFeedback('success');
      setVoiceNotes([...voiceNotes, transcript.trim()]);
    }
  }

  function handleRemoveVoiceNote(index: number) {
    setVoiceNotes(voiceNotes.filter((_, i) => i !== index));
  }

  async function handleContinue() {
    if (!user || !elderInfo) return;

    setSaving(true);

    try {
      // Save each observation category to the observations table
      const observationRecords = observations.map((obs) => ({
        visit_id: id,
        elder_id: elderInfo.id,
        caregiver_id: user.id,
        category: obs.category,
        value: obs.value,
        is_flagged: obs.value.includes('anxious') || obs.value.includes('confused') || obs.value === 'no_appetite',
      }));

      if (observationRecords.length > 0) {
        const { error: obsError } = await supabase
          .from('observations')
          .insert(observationRecords);

        if (obsError) {
          console.error('Error saving observations:', obsError);
        }
      }

      // Save voice notes if any
      if (voiceNotes.length > 0) {
        const voiceNoteRecords = voiceNotes.map((note) => ({
          visit_id: id,
          elder_id: elderInfo.id,
          caregiver_id: user.id,
          category: 'voice_note',
          note: note,
          is_flagged: false,
        }));

        const { error: voiceError } = await supabase
          .from('observations')
          .insert(voiceNoteRecords);

        if (voiceError) {
          console.error('Error saving voice notes:', voiceError);
        }
      }

      await hapticFeedback('success');
      router.push(`/(protected)/caregiver/visit/${id}/check-out`);
    } catch (error) {
      console.error('Error saving observations:', error);
      setSaving(false);
    }
  }

  function handleBack() {
    router.back();
  }

  const selectedMood = observations.find((o) => o.category === 'mood')?.value;
  const selectedAppetite = observations.find((o) => o.category === 'appetite')?.value;
  const selectedMobility = observations.find((o) => o.category === 'mobility')?.value;
  const selectedActivity = observations.find((o) => o.category === 'activity')?.value;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TapButton
          icon={<ArrowLeftIcon size={24} color={colors.text.secondary} />}
          size="medium"
          variant="neutral"
          onPress={handleBack}
        />
        <Text style={styles.headerTitle}>Observations</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>How is {clientName} today?</Text>
          <Text style={styles.subtitle}>Tap icons to record observations</Text>
        </View>

        {/* Mood Category */}
        <ObservationCategory
          title="Mood"
          options={MOOD_OPTIONS}
          selected={selectedMood}
          onSelect={(value, icon) => handleSelectObservation('mood', value, icon)}
        />

        {/* Appetite Category */}
        <ObservationCategory
          title="Appetite"
          options={APPETITE_OPTIONS}
          selected={selectedAppetite}
          onSelect={(value, icon) => handleSelectObservation('appetite', value, icon)}
        />

        {/* Mobility Category */}
        <ObservationCategory
          title="Mobility"
          options={MOBILITY_OPTIONS}
          selected={selectedMobility}
          onSelect={(value, icon) => handleSelectObservation('mobility', value, icon)}
        />

        {/* Activity Level */}
        <ObservationCategory
          title="Activity Level"
          options={ACTIVITY_OPTIONS}
          selected={selectedActivity}
          onSelect={(value, icon) => handleSelectObservation('activity', value, icon)}
        />

        {/* Voice Notes Section */}
        <View style={styles.voiceSection}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <Text style={styles.voiceHint}>
            Tap the microphone to add voice notes (optional)
          </Text>

          {/* Existing Voice Notes */}
          {voiceNotes.map((note, index) => (
            <View key={index} style={styles.voiceNote}>
              <Text style={styles.voiceNoteText}>{note}</Text>
              <TapButton
                icon={<XIcon size={16} color={colors.error[500]} />}
                size="medium"
                variant="neutral"
                onPress={() => handleRemoveVoiceNote(index)}
              />
            </View>
          ))}

          {/* Voice Recording Button */}
          <VoiceNoteButton onTranscript={handleVoiceNote} />
        </View>

        {/* Bottom spacer for continue button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TapButton
          icon={<CheckIcon size={32} color={colors.white} />}
          label="Continue"
          variant="success"
          size="large"
          onPress={handleContinue}
          disabled={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  sectionTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  voiceSection: {
    marginTop: spacing[6],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  voiceHint: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  voiceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    width: '100%',
  },
  voiceNoteText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing[2],
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});
