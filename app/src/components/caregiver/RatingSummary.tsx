/**
 * RatingSummary — Compact rating display component
 *
 * Shows: "87% positive · 23 reviews" with optional top tags.
 * Two modes:
 *   - compact: single line for directory cards
 *   - full: multi-line with top tags for profile views
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ThumbsUpIcon, ThumbsDownIcon } from '@/components/icons';

interface RatingStats {
  rating_count: number;
  positive_count: number;
}

interface TopTag {
  tag: string;
  tag_count: number;
}

const TAG_LABELS: Record<string, string> = {
  reliable: 'Reliable',
  compassionate: 'Compassionate',
  skilled: 'Skilled',
  punctual: 'Punctual',
  professional: 'Professional',
  communicative: 'Communicative',
};

interface Props {
  caregiverProfileId?: string;
  ratingCount?: number;
  positiveCount?: number;
  mode?: 'compact' | 'full';
  onViewReviews?: () => void;
}

export function RatingSummary({
  caregiverProfileId,
  ratingCount: propRatingCount,
  positiveCount: propPositiveCount,
  mode = 'compact',
  onViewReviews,
}: Props) {
  const [topTags, setTopTags] = useState<TopTag[]>([]);

  const ratingCount = propRatingCount ?? 0;
  const positiveCount = propPositiveCount ?? 0;
  const percentage =
    ratingCount > 0 ? Math.round((positiveCount / ratingCount) * 100) : 0;

  // Fetch top tags only in full mode
  useEffect(() => {
    if (mode === 'full' && caregiverProfileId && ratingCount > 0) {
      fetchTopTags();
    }
  }, [mode, caregiverProfileId, ratingCount]);

  async function fetchTopTags() {
    if (!caregiverProfileId) return;

    const { data } = await supabase.rpc('get_caregiver_top_tags', {
      p_caregiver_profile_id: caregiverProfileId,
      p_limit: 3,
    });

    if (data) {
      setTopTags(data as TopTag[]);
    }
  }

  if (ratingCount === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noRatings}>No reviews yet</Text>
      </View>
    );
  }

  if (mode === 'compact') {
    return (
      <Pressable
        style={styles.compactContainer}
        onPress={onViewReviews}
        disabled={!onViewReviews}
      >
        {percentage >= 50 ? <ThumbsUpIcon size={14} color="#059669" /> : <ThumbsDownIcon size={14} color="#DC2626" />}
        <Text style={styles.compactText}>
          {percentage}%{' '}
          <Text style={styles.compactLight}>· {ratingCount} reviews</Text>
        </Text>
      </Pressable>
    );
  }

  // Full mode
  return (
    <View style={styles.fullContainer}>
      <View style={styles.fullHeader}>
        <View style={styles.percentageRow}>
          {percentage >= 50 ? <ThumbsUpIcon size={22} color="#059669" /> : <ThumbsDownIcon size={22} color="#DC2626" />}
          <Text style={styles.percentageText}>{percentage}%</Text>
          <Text style={styles.percentageLabel}>positive</Text>
        </View>
        <Text style={styles.reviewCount}>
          {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {topTags.length > 0 && (
        <View style={styles.tagsRow}>
          {topTags.map((t) => (
            <View key={t.tag} style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>
                {TAG_LABELS[t.tag] || t.tag}
              </Text>
              <Text style={styles.tagBadgeCount}>{t.tag_count}</Text>
            </View>
          ))}
        </View>
      )}

      {onViewReviews && (
        <Pressable style={styles.viewAllButton} onPress={onViewReviews}>
          <Text style={styles.viewAllText}>View All Reviews</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  noRatings: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  // Compact mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thumbIcon: {
    fontSize: 14,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  compactLight: {
    fontWeight: '400',
    color: '#6B7280',
  },
  // Full mode
  fullContainer: {
    gap: 12,
  },
  fullHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thumbIconLarge: {
    fontSize: 22,
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Fraunces_700Bold',
  },
  percentageLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  reviewCount: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
  },
  tagBadgeText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  tagBadgeCount: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  viewAllButton: {
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
