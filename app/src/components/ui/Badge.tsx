// HealthGuide Badge Component
// Status indicators for tasks, visits, and notifications

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: {
    bg: colors.success[100],
    text: colors.success[700],
    dot: colors.success[500],
  },
  error: {
    bg: colors.error[100],
    text: colors.error[700],
    dot: colors.error[500],
  },
  warning: {
    bg: colors.warning[100],
    text: colors.warning[700],
    dot: colors.warning[500],
  },
  info: {
    bg: colors.primary[100],
    text: colors.primary[700],
    dot: colors.primary[500],
  },
  neutral: {
    bg: colors.neutral[100],
    text: colors.neutral[700],
    dot: colors.neutral[500],
  },
};

const sizeConfig: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number; dotSize: number }> = {
  sm: { paddingH: 6, paddingV: 2, fontSize: 10, dotSize: 6 },
  md: { paddingH: 8, paddingV: 4, fontSize: 12, dotSize: 8 },
  lg: { paddingH: 12, paddingV: 6, fontSize: 14, dotSize: 10 },
};

export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
  style,
}: BadgeProps) {
  const colorStyle = variantColors[variant];
  const sizeStyle = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colorStyle.bg,
          paddingHorizontal: sizeStyle.paddingH,
          paddingVertical: sizeStyle.paddingV,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              width: sizeStyle.dotSize,
              height: sizeStyle.dotSize,
              backgroundColor: colorStyle.dot,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: colorStyle.text,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Notification count badge (circular)
interface CountBadgeProps {
  count: number;
  max?: number;
}

export function CountBadge({ count, max = 99 }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();

  if (count <= 0) return null;

  return (
    <View style={styles.countBadge}>
      <Text style={styles.countText}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    gap: 4,
  },
  dot: {
    borderRadius: borderRadius.full,
  },
  text: {
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error[500],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
