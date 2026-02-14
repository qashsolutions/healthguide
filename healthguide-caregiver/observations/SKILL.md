---
name: healthguide-caregiver-observations
description: Icon-based observations and notes for HealthGuide caregivers. Pre-built observation templates with icons, optional voice-to-text for detailed notes. Use when building note-taking screens, observation templates, or voice input features.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: caregiver
  tags: [observations, notes, voice-to-text, icons, templates]
---

# HealthGuide Caregiver Observations

## Overview
Caregivers can record observations about the elder's wellbeing using icon-based templates. Examples: "John walked slower than usual", "Didn't finish meal". Voice-to-text available for detailed notes. All observations are sent to family in the daily report.

## Design Principles

1. **Icon Templates First** - Quick tap to record common observations
2. **Voice Fallback** - Speak detailed notes when needed
3. **No Required Typing** - All input is optional
4. **Professional Language** - Templates use appropriate phrasing

## Observation Categories

- **Mood/Behavior** - Happy, quiet, confused, anxious
- **Appetite** - Ate well, ate little, didn't eat
- **Mobility** - Walking well, slower than usual, needed help
- **Activity Level** - Active, resting, sleeping
- **General Notes** - Free-form observations

## Instructions

### Step 1: Observations Screen

```typescript
// app/(protected)/caregiver/visit/[id]/notes.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ObservationCategory } from '@/components/caregiver/ObservationCategory';
import { VoiceNoteButton } from '@/components/caregiver/VoiceNoteButton';
import { TapButton } from '@/components/ui/TapButton';
import { CheckIcon } from '@/components/icons';

interface Observation {
  category: string;
  value: string;
  icon: string;
}

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleSelectObservation(category: string, value: string, icon: string) {
    // Toggle observation
    const exists = observations.find(
      (o) => o.category === category && o.value === value
    );

    if (exists) {
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
      setVoiceNotes([...voiceNotes, transcript.trim()]);
    }
  }

  async function handleContinue() {
    setSaving(true);

    // Save observations to visit
    await supabase
      .from('visits')
      .update({
        observations: observations,
        voice_notes: voiceNotes,
      })
      .eq('id', id);

    router.push(`/caregiver/visit/${id}/check-out`);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>How is {clientName} today?</Text>
        <Text style={styles.subtitle}>Tap icons to record observations</Text>

        {/* Mood Category */}
        <ObservationCategory
          title="Mood"
          options={MOOD_OPTIONS}
          selected={observations.find((o) => o.category === 'mood')?.value}
          onSelect={(value, icon) => handleSelectObservation('mood', value, icon)}
        />

        {/* Appetite Category */}
        <ObservationCategory
          title="Appetite"
          options={APPETITE_OPTIONS}
          selected={observations.find((o) => o.category === 'appetite')?.value}
          onSelect={(value, icon) => handleSelectObservation('appetite', value, icon)}
        />

        {/* Mobility Category */}
        <ObservationCategory
          title="Mobility"
          options={MOBILITY_OPTIONS}
          selected={observations.find((o) => o.category === 'mobility')?.value}
          onSelect={(value, icon) => handleSelectObservation('mobility', value, icon)}
        />

        {/* Activity Level */}
        <ObservationCategory
          title="Activity"
          options={ACTIVITY_OPTIONS}
          selected={observations.find((o) => o.category === 'activity')?.value}
          onSelect={(value, icon) => handleSelectObservation('activity', value, icon)}
        />

        {/* Voice Notes */}
        <View style={styles.voiceSection}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <Text style={styles.voiceHint}>
            Tap the microphone to add voice notes
          </Text>

          {voiceNotes.map((note, index) => (
            <View key={index} style={styles.voiceNote}>
              <Text style={styles.voiceNoteText}>{note}</Text>
            </View>
          ))}

          <VoiceNoteButton onTranscript={handleVoiceNote} />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TapButton
          icon={<CheckIcon size={32} color="#FFFFFF" />}
          label="Continue"
          variant="success"
          size="medium"
          onPress={handleContinue}
          disabled={saving}
        />
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  voiceSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  voiceHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  voiceNote: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  voiceNoteText: {
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    alignItems: 'center',
  },
});
```

### Step 2: Observation Category Component

```typescript
// components/caregiver/ObservationCategory.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getObservationIcon } from '@/components/icons/ObservationIcons';

interface Option {
  value: string;
  label: string;
  icon: string;
}

interface Props {
  title: string;
  options: Option[];
  selected?: string;
  onSelect: (value: string, icon: string) => void;
}

export function ObservationCategory({ title, options, selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const Icon = getObservationIcon(option.icon);
          const isSelected = selected === option.value;

          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => onSelect(option.value, option.icon)}
            >
              <Icon
                size={40}
                color={isSelected ? '#3B82F6' : '#6B7280'}
              />
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    width: 90,
    height: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E4E4E7',
  },
  optionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  labelSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
```

### Step 3: Voice Note Button with Speech-to-Text

```typescript
// components/caregiver/VoiceNoteButton.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { MicrophoneIcon, StopIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/platform';

interface Props {
  onTranscript: (text: string) => void;
}

export function VoiceNoteButton({ onTranscript }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (isRecording) {
      // Pulse animation while recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  async function startRecording() {
    try {
      await hapticFeedback('medium');

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert('Microphone permission required for voice notes');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      await hapticFeedback('light');
      setIsRecording(false);
      setTranscribing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Send to speech-to-text service
        const transcript = await transcribeAudio(uri);
        if (transcript) {
          onTranscript(transcript);
        }
      }

      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          style={[
            styles.button,
            isRecording && styles.buttonRecording,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={transcribing}
        >
          {isRecording ? (
            <StopIcon size={48} color="#FFFFFF" />
          ) : (
            <MicrophoneIcon size={48} color="#FFFFFF" />
          )}
        </Pressable>
      </Animated.View>

      <Text style={styles.hint}>
        {transcribing
          ? 'Converting to text...'
          : isRecording
          ? 'Tap to stop'
          : 'Tap to record'}
      </Text>
    </View>
  );
}

async function transcribeAudio(audioUri: string): Promise<string | null> {
  try {
    // Upload to Supabase Storage
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'voice_note.m4a',
    } as any);

    // Call Edge Function for transcription
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/transcribe-audio`,
      {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
      }
    );

    const { transcript } = await response.json();
    return transcript;
  } catch (error) {
    console.error('Transcription failed:', error);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRecording: {
    backgroundColor: '#EF4444',
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
```

### Step 4: Observation Icons

```typescript
// components/icons/ObservationIcons.tsx
import Svg, { Path, Circle } from 'react-native-svg';

// Mood Icons
export function MoodHappyIcon({ size = 40, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      <Path
        d="M12 24C14 28 26 28 28 24"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoodQuietIcon({ size = 40, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      <Path d="M14 26H26" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function MoodConfusedIcon({ size = 40, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      <Path
        d="M14 26C16 24 24 28 26 26"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Appetite Icons
export function AppetiteGoodIcon({ size = 40, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="24" r="12" stroke={color} strokeWidth="2" />
      <Path d="M20 4V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M14 4V8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M26 4V8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M14 20H26" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M14 24H26" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M14 28H26" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function AppetiteLittleIcon({ size = 40, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="24" r="12" stroke={color} strokeWidth="2" />
      <Path d="M20 4V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M17 24H23" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// Icon mapping
const OBSERVATION_ICONS: Record<string, React.ComponentType<any>> = {
  mood_happy: MoodHappyIcon,
  mood_calm: MoodCalmIcon,
  mood_quiet: MoodQuietIcon,
  mood_confused: MoodConfusedIcon,
  mood_anxious: MoodAnxiousIcon,
  appetite_good: AppetiteGoodIcon,
  appetite_some: AppetiteSomeIcon,
  appetite_little: AppetiteLittleIcon,
  appetite_none: AppetiteNoneIcon,
  mobility_good: MobilityGoodIcon,
  mobility_slow: MobilitySlowIcon,
  mobility_help: MobilityHelpIcon,
  mobility_seated: MobilitySeatedIcon,
  activity_high: ActivityHighIcon,
  activity_medium: ActivityMediumIcon,
  activity_low: ActivityLowIcon,
  activity_sleep: ActivitySleepIcon,
};

export function getObservationIcon(iconName: string) {
  return OBSERVATION_ICONS[iconName] || MoodQuietIcon;
}
```

## Troubleshooting

### Voice recording fails
**Cause:** Microphone permission not granted
**Solution:** Request permission with explanation, show settings link

### Transcription quality poor
**Cause:** Background noise or unclear speech
**Solution:** Use noise cancellation, allow re-recording
