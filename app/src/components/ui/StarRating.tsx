// HealthGuide StarRating — Interactive 1-5 star selector + static display
// Used for visit ratings (Phase 10)

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StarIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  showLabel?: boolean;
  disabled?: boolean;
}

const LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};

export function StarRating({
  rating,
  onChange,
  size = 36,
  showLabel = false,
  disabled = false,
}: StarRatingProps) {
  const interactive = !!onChange && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= rating;
          return (
            <Pressable
              key={star}
              onPress={() => interactive && onChange!(star)}
              disabled={!interactive}
              style={[styles.starButton, { width: size + 12, height: size + 12 }]}
              hitSlop={4}
            >
              <StarIcon
                size={size}
                color={filled ? colors.warning[500] : colors.neutral[200]}
              />
            </Pressable>
          );
        })}
      </View>
      {showLabel && rating > 0 && (
        <Text style={styles.label}>{LABELS[rating]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  starButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.styles.body,
    color: colors.warning[600],
    fontWeight: '700',
    marginTop: spacing[2],
  },
});
