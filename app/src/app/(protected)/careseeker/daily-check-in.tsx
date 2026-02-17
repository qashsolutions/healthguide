// HealthGuide Elder Daily Check-In
// Per healthguide-community/elder-engagement skill - Simple mood tracking

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import * as Haptics from 'expo-haptics';
import {
  SadFaceIcon,
  FrownFaceIcon,
  NeutralFaceIcon,
  SmileFaceIcon,
  LoveFaceIcon,
  CheckIcon,
  SparkleIcon,
  type IconProps,
} from '@/components/icons';

const MOOD_OPTIONS = [
  { value: 1, Icon: SadFaceIcon, iconColor: '#EF4444', label: 'Not Good', color: colors.error[100], borderColor: colors.error[300] },
  { value: 2, Icon: FrownFaceIcon, iconColor: '#F97316', label: 'A Little Low', color: colors.warning[100], borderColor: colors.warning[300] },
  { value: 3, Icon: NeutralFaceIcon, iconColor: '#EAB308', label: 'Okay', color: colors.neutral[100], borderColor: colors.neutral[300] },
  { value: 4, Icon: SmileFaceIcon, iconColor: '#22C55E', label: 'Good', color: colors.success[100], borderColor: colors.success[300] },
  { value: 5, Icon: LoveFaceIcon, iconColor: '#EC4899', label: 'Great!', color: colors.primary[100], borderColor: colors.primary[300] },
];

export default function ElderDailyCheckInScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleMoodSelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMood(value);
  };

  async function handleSubmit() {
    if (!selectedMood || !user?.id) return;

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Save check-in
      await supabase.from('elder_daily_checkins').upsert({
        elder_id: user.id,
        check_in_date: new Date().toISOString().split('T')[0],
        mood: selectedMood,
      });

      // If mood is low, optionally notify family
      if (selectedMood <= 2) {
        try {
          await supabase.functions.invoke('notify-family-elder-mood', {
            body: {
              elder_id: user.id,
              mood: selectedMood,
            },
          });
        } catch (e) {
          // Notification is optional
          console.log('Could not notify family:', e);
        }
      }

      setCompleted(true);
    } catch (error) {
      console.error('Error saving check-in:', error);
    }

    setSaving(false);
  }

  if (completed) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Check-In',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.completedContainer}>
          <View style={styles.completedIcon}>
            <CheckIcon size={48} color={colors.success[500]} />
          </View>
          <Text style={styles.completedTitle}>Thank You!</Text>
          <Text style={styles.completedSubtitle}>
            Your check-in is complete.{'\n'}Have a wonderful day!
          </Text>
          <Button
            title="Done"
            variant="primary"
            size="lg"
            onPress={() => router.back()}
            style={styles.doneButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Daily Check-In',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Good Morning!</Text>
            <SparkleIcon size={28} color={colors.warning[400]} />
          </View>
          <Text style={styles.question}>How are you feeling today?</Text>
        </View>

        {/* Mood Options */}
        <View style={styles.moodList}>
          {MOOD_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.moodCard,
                { backgroundColor: option.color },
                selectedMood === option.value && [
                  styles.moodCardSelected,
                  { borderColor: option.borderColor },
                ],
              ]}
              onPress={() => handleMoodSelect(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: selectedMood === option.value }}
            >
              <View style={styles.moodIconWrap}>
                <option.Icon size={48} color={option.iconColor} />
              </View>
              <Text style={styles.moodLabel}>{option.label}</Text>
              {selectedMood === option.value && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Submit Button */}
        <Button
          title="Done ✓"
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          disabled={!selectedMood}
          loading={saving}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  greeting: {
    ...typography.elder.heading,
    color: colors.text.primary,
    textAlign: 'center',
  },
  question: {
    ...typography.elder.body,
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 22,
  },
  moodList: {
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: borderRadius['2xl'],
    borderWidth: 3,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  moodCardSelected: {
    borderWidth: 4,
  },
  moodIconWrap: {
    marginRight: spacing[4],
  },
  moodLabel: {
    ...typography.elder.button,
    color: colors.text.primary,
    flex: 1,
  },
  checkmark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '700',
  },
  submitButton: {
    paddingVertical: spacing[5],
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  completedIcon: {
    marginBottom: spacing[6],
  },
  completedTitle: {
    ...typography.elder.heading,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  completedSubtitle: {
    ...typography.elder.body,
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
    marginBottom: spacing[8],
  },
  doneButton: {
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
});
