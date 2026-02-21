// HealthGuide Elder — Rate Companion
// Elder (or family member) rates the companion after a completed visit
// Stars (1-5) + reason text (min 10 chars) + submit
// Navigated to via push notification or from "My Requests" screen

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { StarRating } from '@/components/ui/StarRating';
import { PersonIcon, CheckIcon } from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface VisitInfo {
  companionName: string;
  companionUserId: string;
  durationMinutes: number;
}

export default function ElderRateVisitScreen() {
  const router = useRouter();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { user } = useAuth();

  const [visitInfo, setVisitInfo] = useState<VisitInfo | null>(null);
  const [rating, setRating] = useState(0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVisit = useCallback(async () => {
    if (!visitId) return;

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          caregiver_id,
          duration_minutes,
          actual_start,
          actual_end
        `)
        .eq('id', visitId)
        .single();

      if (error) throw error;

      // Fetch companion name from user_profiles
      const { data: companionProfile } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('id', data.caregiver_id)
        .single();

      // Calculate duration if not stored
      let duration = data.duration_minutes || 0;
      if (!duration && data.actual_start && data.actual_end) {
        const start = new Date(data.actual_start).getTime();
        const end = new Date(data.actual_end).getTime();
        duration = Math.round((end - start) / 60000);
      }

      setVisitInfo({
        companionName: companionProfile
          ? `${companionProfile.first_name} ${companionProfile.last_name}`
          : 'Companion',
        companionUserId: data.caregiver_id,
        durationMinutes: duration,
      });

      // Check if already rated
      if (user?.id) {
        const { data: existing } = await supabase
          .from('visit_ratings')
          .select('id')
          .eq('visit_id', visitId)
          .eq('rated_by', user.id)
          .maybeSingle();

        if (existing) {
          setSubmitted(true);
        }
      }
    } catch (err) {
      console.error('Error loading visit:', err);
    }
    setLoading(false);
  }, [visitId, user?.id]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  async function handleSubmit() {
    if (rating === 0 || reason.trim().length < 10 || !visitInfo || !user?.id) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('visit_ratings')
        .insert({
          visit_id: visitId,
          rated_by: user.id,
          rated_user: visitInfo.companionUserId,
          rating,
          reason: reason.trim(),
        });

      if (error) {
        if (error.code === '23505') {
          const msg = 'You already rated this visit.';
          Platform.OS === 'web' ? alert(msg) : Alert.alert('Already Rated', msg);
        } else {
          throw error;
        }
        return;
      }

      setSubmitted(true);

      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err: any) {
      const msg = err.message || 'Could not submit rating';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    router.back();
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Rate Companion', headerShown: true, headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.centerWrap}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ title: 'Rate Companion', headerShown: true, headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.centerWrap}>
            <View style={styles.successCircle}>
              <CheckIcon size={48} color={colors.white} />
            </View>
            <Text style={styles.successTitle}>Thank you!</Text>
            <Text style={styles.successSub}>Your feedback helps companions improve.</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Rate Companion', headerShown: true, headerBackTitle: 'Skip' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Companion card */}
            <View style={styles.companionCard}>
              <View style={styles.companionAvatar}>
                <PersonIcon size={32} color={roleColors.caregiver} />
              </View>
              <View>
                <Text style={styles.companionName}>{visitInfo?.companionName || 'Companion'}</Text>
                {visitInfo && visitInfo.durationMinutes > 0 && (
                  <Text style={styles.durationText}>
                    Visit: {Math.floor(visitInfo.durationMinutes / 60)}h {visitInfo.durationMinutes % 60}m
                  </Text>
                )}
              </View>
            </View>

            {/* Rating */}
            <Text style={styles.prompt}>How was your companion?</Text>
            <StarRating rating={rating} onChange={setRating} size={44} showLabel />

            {/* Reason */}
            <Text style={styles.reasonLabel}>Tell us more (min 10 characters)</Text>
            <TextInput
              style={[styles.reasonInput, { outlineStyle: 'none' as any }]}
              value={reason}
              onChangeText={setReason}
              placeholder="What did you appreciate or what could be better?"
              placeholderTextColor={colors.text.tertiary}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{reason.length}/500</Text>

            {/* Submit */}
            <Button
              title="Submit Rating"
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              loading={submitting}
              disabled={rating === 0 || reason.trim().length < 10 || submitting}
              style={styles.submitButton}
            />

            {/* Skip */}
            <Button
              title="Skip for now"
              variant="ghost"
              fullWidth
              onPress={handleSkip}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  loadingText: { ...typography.styles.body, color: colors.text.tertiary },
  scrollContent: { padding: spacing[5], paddingBottom: spacing[8] },

  // Companion card
  companionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[6],
  },
  companionAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionName: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  durationText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Rating
  prompt: {
    ...typography.styles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },

  // Reason
  reasonLabel: {
    ...typography.styles.label,
    color: colors.text.secondary,
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  reasonInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    minHeight: 100,
    ...typography.styles.body,
    color: colors.text.primary,
  },
  charCount: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing[1],
  },

  // Submit
  submitButton: {
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },

  // Success
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  successTitle: {
    ...typography.styles.h2,
    color: colors.success[600],
    marginBottom: spacing[2],
  },
  successSub: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
