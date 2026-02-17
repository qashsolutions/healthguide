// HealthGuide Empty State
// Illustrated empty state with optional action button

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  CalendarIllustration,
  ClipboardIllustration,
  SearchIllustration,
  CommunityIllustration,
} from './illustrations';

const illustrations = {
  calendar: CalendarIllustration,
  clipboard: ClipboardIllustration,
  search: SearchIllustration,
  community: CommunityIllustration,
} as const;

export type IllustrationName = keyof typeof illustrations;

interface EmptyStateProps {
  illustration: IllustrationName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({
  illustration,
  title,
  subtitle,
  actionLabel,
  onAction,
  color = colors.primary[500],
}: EmptyStateProps) {
  const Illustration = illustrations[illustration];

  return (
    <View style={styles.container}>
      <View style={styles.illustrationWrap}>
        <Illustration size={80} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: color },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
  },
  illustrationWrap: {
    marginBottom: spacing[5],
  },
  title: {
    ...typography.styles.h4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: spacing[5],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  actionText: {
    ...typography.styles.button,
    color: colors.white,
  },
});
