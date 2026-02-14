// HealthGuide Button Component
// Per healthguide-core/ui-components skill - Large touch targets

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  PressableProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { touchTargets, borderRadius, shadows } from '@/theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'caregiver' | 'elder' | 'small' | 'large';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const variantColors: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: {
    bg: colors.primary[500],
    text: colors.white,
    border: colors.primary[500],
  },
  secondary: {
    bg: colors.white,
    text: colors.primary[600],
    border: colors.primary[300],
  },
  success: {
    bg: colors.success[500],
    text: colors.white,
    border: colors.success[500],
  },
  danger: {
    bg: colors.error[500],
    text: colors.white,
    border: colors.error[500],
  },
  ghost: {
    bg: 'transparent',
    text: colors.primary[600],
    border: 'transparent',
  },
  outline: {
    bg: 'transparent',
    text: colors.primary[600],
    border: colors.primary[500],
  },
};

const sizeConfig: Record<ButtonSize, { height: number; paddingH: number; fontSize: number; iconSize: number }> = {
  sm: { height: 36, paddingH: 12, fontSize: 14, iconSize: 16 },
  small: { height: 36, paddingH: 12, fontSize: 14, iconSize: 16 },
  md: { height: 44, paddingH: 16, fontSize: 16, iconSize: 20 },
  lg: { height: 52, paddingH: 20, fontSize: 18, iconSize: 24 },
  large: { height: 60, paddingH: 24, fontSize: 20, iconSize: 28 },
  xl: { height: 60, paddingH: 24, fontSize: 20, iconSize: 28 },
  caregiver: { height: touchTargets.caregiver, paddingH: 28, fontSize: 22, iconSize: 32 },
  elder: { height: touchTargets.elder, paddingH: 32, fontSize: 26, iconSize: 40 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const variantStyle = variantColors[variant];
  const sizeStyle = sizeConfig[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          height: sizeStyle.height,
          minHeight: touchTargets.minimum,
          paddingHorizontal: sizeStyle.paddingH,
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variantStyle.text} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.text,
                {
                  color: variantStyle.text,
                  fontSize: sizeStyle.fontSize,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
