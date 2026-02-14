// HealthGuide Voice Note Button
// Per healthguide-caregiver/observations skill - Voice-to-text for notes

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert, Platform } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { MicrophoneIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/haptics';

interface VoiceNoteButtonProps {
  onTranscript: (text: string) => void;
}

export function VoiceNoteButton({ onTranscript }: VoiceNoteButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, pulseAnim]);

  async function startRecording() {
    try {
      await hapticFeedback('medium');
      setIsRecording(true);

      // Note: In production, this would use expo-av for actual audio recording
      // and send to a speech-to-text service (Supabase Edge Function with Whisper API)

      // For now, simulate the recording state
      console.log('Voice recording started...');

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(
        'Recording Error',
        'Could not start voice recording. Please check microphone permissions.',
        [{ text: 'OK' }]
      );
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    try {
      await hapticFeedback('light');
      setIsRecording(false);
      setTranscribing(true);

      // Simulate transcription delay
      // In production, this would:
      // 1. Stop the expo-av recording
      // 2. Upload audio to Supabase Storage
      // 3. Call Edge Function for transcription
      // 4. Return the transcript

      setTimeout(() => {
        // Simulated transcript for development
        const simulatedTranscripts = [
          'Client was in good spirits today and enjoyed our conversation.',
          'Noticed some mild confusion when discussing the calendar.',
          'Client mentioned feeling a bit tired but otherwise comfortable.',
          'Had a nice lunch together, client ate most of the meal.',
        ];
        const randomTranscript = simulatedTranscripts[
          Math.floor(Math.random() * simulatedTranscripts.length)
        ];

        onTranscript(randomTranscript);
        setTranscribing(false);
      }, 1500);

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setTranscribing(false);
    }
  }

  function handlePress() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            isRecording && styles.buttonRecording,
            pressed && styles.buttonPressed,
          ]}
          onPress={handlePress}
          disabled={transcribing}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
          accessibilityState={{ busy: transcribing }}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <MicrophoneIcon size={40} color={colors.white} />
          )}
        </Pressable>
      </Animated.View>

      <Text style={styles.hint}>
        {transcribing
          ? 'Converting to text...'
          : isRecording
          ? `Recording ${formatDuration(recordingDuration)}`
          : 'Tap to record a voice note'}
      </Text>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  button: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: colors.error[500],
    shadowColor: colors.error[500],
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
  stopIcon: {
    width: 24,
    height: 24,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  hint: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.full,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error[500],
    marginRight: spacing[2],
  },
  recordingText: {
    ...typography.styles.caption,
    color: colors.error[600],
    fontWeight: '500',
  },
});
