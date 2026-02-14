// HealthGuide TapButton Component
// Per healthguide-core/theming skill - Large tap buttons for caregiver task completion

import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { touchTargets, borderRadius, shadows } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TapButtonVariant = 'success' | 'error' | 'neutral' | 'primary' | 'warning';
export type TapButtonSize = 'medium' | 'large' | 'xlarge';

interface TapButtonProps {
  icon: React.ReactNode;
  label?: string;
  variant?: TapButtonVariant;
  size?: TapButtonSize;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}

const variantColors: Record<TapButtonVariant, { bg: string; selectedBg: string }> = {
  success: {
    bg: colors.success[100],
    selectedBg: colors.success[500],
  },
  error: {
    bg: colors.error[100],
    selectedBg: colors.error[500],
  },
  neutral: {
    bg: colors.neutral[100],
    selectedBg: colors.neutral[400],
  },
  primary: {
    bg: colors.primary[100],
    selectedBg: colors.primary[500],
  },
  warning: {
    bg: colors.warning[100],
    selectedBg: colors.warning[500],
  },
};

const sizeConfig: Record<TapButtonSize, number> = {
  medium: 80,
  large: touchTargets.action,
  xlarge: 140,
};

export function TapButton({
  icon,
  label,
  variant = 'primary',
  size = 'large',
  onPress,
  disabled = false,
  selected = false,
}: TapButtonProps) {
  const buttonSize = sizeConfig[size];
  const variantStyle = variantColors[variant];
  const bgColor = selected ? variantStyle.selectedBg : variantStyle.bg;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: pressed ? variantStyle.selectedBg : bgColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected }}
      >
        <View style={styles.iconContainer}>{icon}</View>
      </Pressable>
      {label && (
        <Text
          style={[
            styles.label,
            selected && styles.labelSelected,
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  button: {
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.caregiver.label,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 120,
  },
  labelSelected: {
    color: colors.text.primary,
    fontWeight: '700',
  },
});
