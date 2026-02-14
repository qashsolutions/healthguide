---
name: healthguide-core-ui-components
description: Flagship UI design system for HealthGuide with professional SVG icons, reusable components, and role-specific design patterns. Includes icon library, buttons, cards, forms, and accessibility-first components. Use when building any UI screens, adding icons, or ensuring design consistency.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [ui, design-system, svg, icons, components, accessibility]
---

# HealthGuide UI Design System

## Overview
A comprehensive design system built for elder care. Features large touch targets (minimum 48px), high contrast options, and icon-heavy interfaces for caregivers. All components follow WCAG 2.1 AA accessibility guidelines.

## Design Principles

1. **Clarity First** - Large fonts, simple language, clear hierarchy
2. **Touch-Friendly** - Minimum 48x48px touch targets, generous spacing
3. **Role-Optimized** - Different UI complexity per user role
4. **Accessible** - High contrast, screen reader support, scalable text
5. **Consistent** - Unified color palette, spacing, and iconography

## Color Palette

```typescript
// lib/theme/colors.ts
export const colors = {
  // Primary Brand
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main brand color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Secondary (Warm - Care/Compassion)
  secondary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Accent
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Status Colors
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#047857',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#B45309',
  },
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#B91C1C',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#1D4ED8',
  },

  // Neutrals
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Role-Specific Accents
  roles: {
    agency: '#7C3AED',    // Purple
    caregiver: '#3B82F6', // Blue
    elder: '#10B981',     // Green
    volunteer: '#F59E0B', // Amber
    family: '#EC4899',    // Pink
  },
};
```

## Typography Scale

```typescript
// lib/theme/typography.ts
export const typography = {
  // Font Families
  fontFamily: {
    heading: 'Inter-Bold',
    body: 'Inter-Regular',
    mono: 'JetBrainsMono-Regular',
  },

  // Size Scale (base 16px, scaled for accessibility)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Pre-built Text Styles
  styles: {
    h1: { fontSize: 36, fontWeight: '700', lineHeight: 1.2 },
    h2: { fontSize: 30, fontWeight: '700', lineHeight: 1.2 },
    h3: { fontSize: 24, fontWeight: '600', lineHeight: 1.3 },
    h4: { fontSize: 20, fontWeight: '600', lineHeight: 1.4 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 1.5 },
    bodyLarge: { fontSize: 18, fontWeight: '400', lineHeight: 1.5 },
    caption: { fontSize: 14, fontWeight: '400', lineHeight: 1.4 },
    label: { fontSize: 14, fontWeight: '500', lineHeight: 1.4 },
    button: { fontSize: 16, fontWeight: '600', lineHeight: 1 },
    buttonLarge: { fontSize: 18, fontWeight: '600', lineHeight: 1 },
  },
};
```

## Spacing System

```typescript
// lib/theme/spacing.ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

// Touch target sizes
export const touchTargets = {
  minimum: 48,    // WCAG minimum
  comfortable: 56, // Recommended for elderly
  large: 64,      // For primary actions
};
```

## SVG Icon Library

```typescript
// components/icons/index.tsx
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// ============================================
// NAVIGATION ICONS
// ============================================

export function HomeIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UsersIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C7.68563 15.301 8.27672 14.5866 9.03251 14.0909M16.6438 16.1429C16.3144 15.301 15.7233 14.5866 14.9675 14.0909M14.9675 14.0909C14.4434 13.7504 13.823 13.5 13.1429 13.5H10.8571C10.177 13.5 9.55664 13.7504 9.03251 14.0909M14.9675 14.0909C15.6044 13.5203 16 12.7007 16 11.8C16 10.2536 14.7464 9 13.2 9H10.8C9.25361 9 8 10.2536 8 11.8C8 12.7007 8.39565 13.5203 9.03251 14.0909M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ============================================
// ACTION ICONS
// ============================================

export function CheckCircleIcon({ size = 24, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function XCircleIcon({ size = 24, color = '#EF4444' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 14L12 12M12 12L14 10M12 12L10 10M12 12L14 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LocationIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.6569 16.6569C16.7202 17.5935 14.7616 19.5521 13.4138 20.8999C12.6327 21.681 11.3677 21.6814 10.5866 20.9003C9.26234 19.576 7.34159 17.6553 6.34315 16.6569C3.21895 13.5327 3.21895 8.46734 6.34315 5.34315C9.46734 2.21895 14.5327 2.21895 17.6569 5.34315C20.781 8.46734 20.781 13.5327 17.6569 16.6569Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 11C15 12.6569 13.6569 14 12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PhoneIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VideoIcon({ size = 24, color = '#1F2937' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ============================================
// CARE TASK ICONS (Large, Icon-Based UI)
// ============================================

export function BathIcon({ size = 48, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M8 24H40C40 32.8366 32.8366 40 24 40C15.1634 40 8 32.8366 8 24Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 40V44M36 40V44"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M8 24H4V20C4 14.4772 8.47715 10 14 10H16"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="20" cy="6" r="2" fill={color} />
      <Circle cx="28" cy="8" r="2" fill={color} />
      <Circle cx="24" cy="4" r="1.5" fill={color} />
    </Svg>
  );
}

export function MedicationIcon({ size = 48, color = '#EF4444' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect
        x="14"
        y="8"
        width="20"
        height="32"
        rx="4"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
      />
      <Path d="M14 20H34" stroke={color} strokeWidth={3} />
      <Path d="M24 26V34" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path d="M20 30H28" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path
        d="M18 8V6C18 4.89543 18.8954 4 20 4H28C29.1046 4 30 4.89543 30 6V8"
        stroke={color}
        strokeWidth={3}
      />
    </Svg>
  );
}

export function MealIcon({ size = 48, color = '#F59E0B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle
        cx="24"
        cy="28"
        r="14"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
      />
      <Path
        d="M24 18V8M20 8H28"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M18 28C18 28 20 24 24 24C28 24 30 28 30 28"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Circle cx="20" cy="30" r="2" fill={color} />
      <Circle cx="28" cy="30" r="2" fill={color} />
    </Svg>
  );
}

export function WalkingIcon({ size = 48, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="8" r="4" fill={color} />
      <Path
        d="M20 44L22 32L18 24L24 16L30 24L26 32L28 44"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 24L12 28"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M30 24L36 20"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HydrationIcon({ size = 48, color = '#06B6D4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M16 16L14 40C14 42.2091 15.7909 44 18 44H30C32.2091 44 34 42.2091 34 40L32 16"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 16H34"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M20 4V8C20 12 16 16 16 16H32C32 16 28 12 28 8V4"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 28C20 26 22 28 24 26C26 28 28 26 30 28"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ============================================
// STATUS/MOOD ICONS
// ============================================

export function MoodHappyIcon({ size = 48, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle
        cx="24"
        cy="24"
        r="20"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
      />
      <Circle cx="16" cy="20" r="3" fill={color} />
      <Circle cx="32" cy="20" r="3" fill={color} />
      <Path
        d="M14 30C14 30 18 36 24 36C30 36 34 30 34 30"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoodSadIcon({ size = 48, color = '#EF4444' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle
        cx="24"
        cy="24"
        r="20"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
      />
      <Circle cx="16" cy="20" r="3" fill={color} />
      <Circle cx="32" cy="20" r="3" fill={color} />
      <Path
        d="M14 36C14 36 18 30 24 30C30 30 34 36 34 36"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoodNeutralIcon({ size = 48, color = '#F59E0B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle
        cx="24"
        cy="24"
        r="20"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={3}
      />
      <Circle cx="16" cy="20" r="3" fill={color} />
      <Circle cx="32" cy="20" r="3" fill={color} />
      <Path
        d="M14 32H34"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

## Core UI Components

### Button Component

```typescript
// components/ui/Button.tsx
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
}: ButtonProps) {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    medium: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 16 },
    large: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 18 },
    xl: { paddingVertical: 20, paddingHorizontal: 32, fontSize: 20 },
  };

  const variantStyles = {
    primary: {
      backgroundColor: disabled ? colors.neutral[300] : colors.primary[500],
      borderColor: 'transparent',
      textColor: colors.neutral[0],
    },
    secondary: {
      backgroundColor: disabled ? colors.neutral[200] : colors.secondary[500],
      borderColor: 'transparent',
      textColor: colors.neutral[0],
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: disabled ? colors.neutral[300] : colors.primary[500],
      textColor: disabled ? colors.neutral[400] : colors.primary[500],
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: disabled ? colors.neutral[400] : colors.primary[500],
    },
    danger: {
      backgroundColor: disabled ? colors.neutral[300] : colors.error.main,
      borderColor: 'transparent',
      textColor: colors.neutral[0],
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: currentVariant.backgroundColor,
          borderColor: currentVariant.borderColor,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          opacity: pressed ? 0.8 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.textColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              {
                color: currentVariant.textColor,
                fontSize: currentSize.fontSize,
              },
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG minimum
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
```

### Card Component

```typescript
// components/ui/Card.tsx
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '@/lib/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'medium',
  onPress,
  disabled = false,
  style,
}: CardProps) {
  const paddingValues = {
    none: 0,
    small: spacing[3],
    medium: spacing[4],
    large: spacing[6],
  };

  const variantStyles = {
    elevated: {
      backgroundColor: colors.neutral[0],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: colors.neutral[0],
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    filled: {
      backgroundColor: colors.neutral[50],
      borderWidth: 0,
    },
  };

  const cardContent = (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        { padding: paddingValues[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        disabled={disabled}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
  },
});
```

### Icon Button (For Caregiver Task UI)

```typescript
// components/ui/IconButton.tsx
import { Pressable, Text, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '@/lib/theme';

interface IconButtonProps {
  icon: React.ReactNode;
  label?: string;
  onPress: () => void;
  size?: 'medium' | 'large' | 'xl';
  variant?: 'primary' | 'success' | 'danger' | 'neutral';
  disabled?: boolean;
  selected?: boolean;
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 'large',
  variant = 'neutral',
  disabled = false,
  selected = false,
}: IconButtonProps) {
  const sizeValues = {
    medium: { button: 56, icon: 24 },
    large: { button: 72, icon: 32 },
    xl: { button: 96, icon: 48 },
  };

  const variantColors = {
    primary: {
      bg: selected ? colors.primary[500] : colors.primary[50],
      border: colors.primary[500],
    },
    success: {
      bg: selected ? colors.success.main : colors.success.light,
      border: colors.success.main,
    },
    danger: {
      bg: selected ? colors.error.main : colors.error.light,
      border: colors.error.main,
    },
    neutral: {
      bg: selected ? colors.neutral[200] : colors.neutral[100],
      border: colors.neutral[300],
    },
  };

  const currentSize = sizeValues[size];
  const currentVariant = variantColors[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          width: currentSize.button,
          height: currentSize.button,
          backgroundColor: currentVariant.bg,
          borderColor: selected ? currentVariant.border : 'transparent',
          opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
        },
      ]}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.iconContainer}>{icon}</View>
      {label && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[700],
    marginTop: 4,
    textAlign: 'center',
  },
});
```

## Role-Specific Component Patterns

### Agency Owner - Data Dense
```typescript
// Rich tables, charts, detailed forms
// Standard touch targets (48px)
// Full navigation with all features
```

### Caregiver - Icon Heavy
```typescript
// Large icon buttons (72-96px)
// Minimal text, maximum visual feedback
// Limited navigation, focused workflow
// Haptic feedback on all interactions
```

### Elder - Maximum Accessibility
```typescript
// Extra large touch targets (96px+)
// High contrast by default
// Voice feedback option
// Simplified navigation (3 tabs max)
// Large text (20px+ base)
```

## Troubleshooting

### Icons not rendering
**Cause:** react-native-svg not linked
**Solution:** Run `npx expo install react-native-svg`

### Touch targets too small
**Cause:** Custom sizing overriding minimums
**Solution:** Always use minHeight: 48 as baseline

### Colors not accessible
**Cause:** Low contrast ratio
**Solution:** Use color checker, ensure 4.5:1 ratio minimum
