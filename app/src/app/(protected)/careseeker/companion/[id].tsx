// HealthGuide Companion Detail Screen
// Full profile view for a companion, accessible from directory
// Shows photo, bio, services, availability, languages, rating, favorite toggle

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import {
  StarIcon,
  PersonIcon,
  StudentIcon,
  CompanionIcon,
  CheckIcon,
} from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ALLOWED_TASKS } from '@/constants/tasks';

const DAYS_ORDERED = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const SLOT_LABELS: Record<string, string> = {
  '6am-8am': '6–8 AM', '8am-10am': '8–10 AM', '10am-12pm': '10 AM–12 PM',
  '12pm-2pm': '12–2 PM', '2pm-4pm': '2–4 PM', '4pm-6pm': '4–6 PM',
  '6pm-8pm': '6–8 PM', '8pm-10pm': '8–10 PM',
};

const LANGUAGE_LABELS: Record<string, string> = {
  english: 'English', spanish: 'Spanish', mandarin: 'Mandarin',
  cantonese: 'Cantonese', tagalog: 'Tagalog', vietnamese: 'Vietnamese',
  korean: 'Korean', hindi: 'Hindi', arabic: 'Arabic', french: 'French',
  portuguese: 'Portuguese', russian: 'Russian', japanese: 'Japanese',
  haitian_creole: 'Haitian Creole', other: 'Other',
};

const TASK_LABELS: Record<string, { label: string; emoji: string }> = {
  companionship: { label: 'Companionship', emoji: '\uD83D\uDCAC' },
  light_cleaning: { label: 'Light Cleaning', emoji: '\uD83E\uDDF9' },
  groceries: { label: 'Groceries & Errands', emoji: '\uD83D\uDED2' },
};

interface CompanionProfile {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  selfie_url: string | null;
  caregiver_type: 'student' | 'companion_55' | 'professional';
  zip_code: string;
  capabilities: string[];
  availability: Record<string, string[]> | null;
  languages: string[];
  bio: string | null;
  has_transportation: boolean;
  gender: string;
  travel_radius_miles: number;
  college_name?: string;
  program_name?: string;
}

export default function CompanionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompanionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalVisits, setTotalVisits] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('caregiver_profiles')
        .select(`
          id, user_id, full_name, caregiver_type, zip_code,
          capabilities, availability, languages, bio, gender,
          has_transportation, college_name, photo_url, selfie_url,
          travel_radius_miles, program_name
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);

      // Check favorite status
      if (user?.id) {
        const { data: elderData } = await supabase
          .from('elders')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (elderData?.id) {
          const { data: fav } = await supabase
            .from('elder_favorites')
            .select('id')
            .eq('elder_id', elderData.id)
            .eq('companion_id', data.user_id)
            .maybeSingle();
          setIsFavorite(!!fav);
        }
      }

      // Fetch ratings from summary view
      const { data: ratingSummary } = await supabase
        .from('user_ratings_summary')
        .select('avg_rating, total_ratings')
        .eq('rated_user', data.user_id)
        .maybeSingle();

      if (ratingSummary) {
        setAvgRating(ratingSummary.avg_rating);
        setTotalVisits(ratingSummary.total_ratings);
      }
    } catch (err) {
      console.error('Error loading companion:', err);
    }
    setLoading(false);
  }

  async function handleToggleFavorite() {
    if (!user?.id || !profile) return;

    const { data: elderData } = await supabase
      .from('elders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!elderData?.id) return;

    if (isFavorite) {
      await supabase
        .from('elder_favorites')
        .delete()
        .eq('elder_id', elderData.id)
        .eq('companion_id', profile.user_id);
    } else {
      await supabase
        .from('elder_favorites')
        .insert({ elder_id: elderData.id, companion_id: profile.user_id });
    }
    setIsFavorite(!isFavorite);
  }

  if (loading || !profile) {
    return (
      <>
        <Stack.Screen options={{ title: 'Companion', headerShown: true, headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Companion not found'}</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const isStudent = profile.caregiver_type === 'student';
  const photo = profile.selfie_url || profile.photo_url;
  const activeDays = profile.availability
    ? DAYS_ORDERED.filter((d) => (profile.availability![d.key] || []).length > 0)
    : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.full_name,
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Photo + Name */}
          <View style={styles.heroSection}>
            <View style={styles.photoWrap}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <PersonIcon size={48} color={colors.neutral[400]} />
                </View>
              )}
            </View>
            <Text style={styles.name}>{profile.full_name}</Text>

            {/* Type badge */}
            <View style={[styles.typeBadge, isStudent ? styles.studentBadge : styles.companionBadge]}>
              {isStudent ? (
                <StudentIcon size={14} color={colors.white} />
              ) : (
                <CompanionIcon size={14} color={colors.white} />
              )}
              <Text style={styles.typeBadgeText}>
                {isStudent
                  ? `Student${profile.college_name ? ` at ${profile.college_name}` : ''}`
                  : '55+ Companion'}
              </Text>
            </View>

            {/* Zip + rating */}
            <View style={styles.metaRow}>
              {profile.zip_code && (
                <Text style={styles.metaText}>{'\uD83D\uDCCD'} ZIP {profile.zip_code}</Text>
              )}
              {avgRating != null && (
                <Text style={styles.metaText}>
                  {'\u2B50'} {avgRating.toFixed(1)} ({totalVisits} visits)
                </Text>
              )}
            </View>
          </View>

          {/* About */}
          {profile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            {(profile.capabilities || []).map((cap) => {
              const task = TASK_LABELS[cap];
              return (
                <View key={cap} style={styles.serviceRow}>
                  <Text style={styles.serviceEmoji}>{task?.emoji || '\u2022'}</Text>
                  <Text style={styles.serviceLabel}>{task?.label || cap}</Text>
                </View>
              );
            })}
          </View>

          {/* Availability */}
          {activeDays.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              {activeDays.map((day) => {
                const slots = profile.availability![day.key] || [];
                return (
                  <View key={day.key} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={styles.daySlots}>
                      {slots.map((s) => SLOT_LABELS[s] || s).join(', ')}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Languages */}
          {(profile.languages || []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages</Text>
              <View style={styles.langRow}>
                {profile.languages.map((lang) => (
                  <View key={lang} style={styles.langPill}>
                    <Text style={styles.langText}>{LANGUAGE_LABELS[lang] || lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Transportation */}
          {profile.has_transportation && (
            <View style={styles.section}>
              <View style={styles.transportRow}>
                <Text style={styles.transportEmoji}>{'\uD83D\uDE97'}</Text>
                <Text style={styles.transportText}>Has own transportation</Text>
              </View>
            </View>
          )}

          {/* Travel radius */}
          {profile.travel_radius_miles > 0 && (
            <View style={styles.section}>
              <Text style={styles.metaDetail}>
                Travel radius: {profile.travel_radius_miles} miles
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.favBottomButton, isFavorite && styles.favBottomButtonActive]}
            onPress={handleToggleFavorite}
          >
            <StarIcon
              size={20}
              color={isFavorite ? colors.warning[500] : colors.neutral[400]}
            />
            <Text style={[styles.favBottomText, isFavorite && styles.favBottomTextActive]}>
              {isFavorite ? 'Favorited' : 'Favorite'}
            </Text>
          </Pressable>

          <Button
            title="Request Visit"
            onPress={() => {
              // Navigate to visit request flow (Phase 7)
              router.push(`/(protected)/careseeker/request-visit?companionId=${profile.id}` as any);
            }}
            style={styles.requestButton}
            size="lg"
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
    paddingBottom: spacing[8],
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  photoWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    marginBottom: spacing[3],
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  studentBadge: {
    backgroundColor: '#7C3AED',
  },
  companionBadge: {
    backgroundColor: '#059669',
  },
  typeBadgeText: {
    ...typography.styles.caption,
    color: colors.white,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  metaText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },

  // Sections
  section: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing[2],
  },
  bioText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  serviceEmoji: {
    fontSize: 18,
  },
  serviceLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  dayRow: {
    flexDirection: 'row',
    paddingVertical: spacing[1],
  },
  dayLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
    width: 100,
  },
  daySlots: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  langPill: {
    paddingHorizontal: spacing[2.5] || 10,
    paddingVertical: spacing[1],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  langText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  transportEmoji: {
    fontSize: 18,
  },
  transportText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  metaDetail: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing[3],
    alignItems: 'center',
  },
  favBottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5] || 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  favBottomButtonActive: {
    borderColor: colors.warning[300],
    backgroundColor: colors.warning[50],
  },
  favBottomText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  favBottomTextActive: {
    color: colors.warning[600],
  },
  requestButton: {
    flex: 1,
  },
});
