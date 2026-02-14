---
name: healthguide-core-theming
description: Flagship-quality SVG icons and theming for HealthGuide elder care app. Provides professional icon library, color system, typography, and accessibility standards. Use when creating UI components, implementing icons, setting up design tokens, or ensuring accessibility compliance.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [theming, icons, svg, accessibility, design-system]
---

# HealthGuide Core Theming

## Overview
Professional-grade design system optimized for elder care. Caregivers need large, clear icons with minimal text. All UI must be accessible and work for users with varying tech literacy.

## Design Principles

1. **Large Touch Targets** - Minimum 48x48dp for all interactive elements
2. **High Contrast** - WCAG AA compliance minimum
3. **Icon-First** - Visual communication over text for caregivers
4. **Consistent Feedback** - Clear success (green) and error (red) states

## Color System

```typescript
// theme/colors.ts
export const colors = {
  // Primary - Trust & Care
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main primary
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Success - Task Complete
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Green checkmark
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Error - Task Incomplete / Alert
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Red X mark
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Warning - Attention needed
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Neutral - Text & Backgrounds
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },

  // Semantic
  white: '#FFFFFF',
  black: '#000000',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: {
    primary: '#18181B',
    secondary: '#52525B',
    disabled: '#A1A1AA',
    inverse: '#FFFFFF',
  },
};

// Role-specific accent colors
export const roleColors = {
  agency_owner: colors.primary[600],
  caregiver: colors.success[500],
  careseeker: colors.primary[400],
};
```

## Typography

```typescript
// theme/typography.ts
export const typography = {
  // Font families
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },

  // Font sizes (optimized for readability)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Caregiver-specific (larger for easy reading)
  caregiver: {
    heading: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      lineHeight: 1.3,
    },
    body: {
      fontSize: 20,
      fontFamily: 'Inter-Medium',
      lineHeight: 1.5,
    },
    label: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      lineHeight: 1.4,
    },
  },
};
```

## Professional SVG Icons

### Core Icon Components

```typescript
// components/icons/index.tsx
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// Task Complete - Large green checkmark
export function CheckIcon({ size = 24, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} opacity={0.15} />
      <Path
        d="M8 12L11 15L16 9"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Task Incomplete - Large red X
export function XIcon({ size = 24, color = '#EF4444' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} opacity={0.15} />
      <Path
        d="M15 9L9 15M9 9L15 15"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Clock - For scheduling
export function ClockIcon({ size = 24, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path
        d="M12 7V12L15 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Location Pin - For EVV
export function LocationIcon({ size = 24, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill={color}
        opacity={0.15}
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx="12" cy="9" r="2.5" fill={color} />
    </Svg>
  );
}

// Person - For caregiver/careseeker
export function PersonIcon({ size = 24, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M4 21V19C4 16.79 5.79 15 8 15H16C18.21 15 20 16.79 20 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Microphone - For voice notes
export function MicrophoneIcon({ size = 24, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={2} />
      <Path
        d="M5 10V11C5 14.87 8.13 18 12 18C15.87 18 19 14.87 19 11V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M12 18V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 22H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
```

### Task Category Icons

```typescript
// components/icons/TaskIcons.tsx

// Companionship
export function CompanionshipIcon({ size = 48, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="18" cy="16" r="6" stroke={color} strokeWidth={2.5} />
      <Circle cx="30" cy="16" r="6" stroke={color} strokeWidth={2.5} />
      <Path
        d="M8 40V36C8 32.69 10.69 30 14 30H22C25.31 30 28 32.69 28 36V40"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M28 40V36C28 32.69 30.69 30 34 30H34C37.31 30 40 32.69 40 36V40"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Meal Preparation
export function MealIcon({ size = 48, color = '#F59E0B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="28" r="14" stroke={color} strokeWidth={2.5} />
      <Path d="M24 8V14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M17 10L19 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M31 10L29 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Light Housekeeping
export function CleaningIcon({ size = 48, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M12 40L16 20H32L36 40"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M24 8V20" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path
        d="M18 12H30"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Errands
export function ErrandsIcon({ size = 48, color = '#8B5CF6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="8" y="16" width="32" height="24" rx="3" stroke={color} strokeWidth={2.5} />
      <Path d="M16 16V12C16 9.79 17.79 8 20 8H28C30.21 8 32 9.79 32 12V16" stroke={color} strokeWidth={2.5} />
      <Circle cx="18" cy="28" r="3" fill={color} />
      <Circle cx="30" cy="28" r="3" fill={color} />
    </Svg>
  );
}

// Mobility Assistance
export function MobilityIcon({ size = 48, color = '#EC4899' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="10" r="4" stroke={color} strokeWidth={2.5} />
      <Path
        d="M20 20H28L30 32H36"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="30" cy="38" r="4" stroke={color} strokeWidth={2.5} />
      <Path d="M18 20V38H12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
```

## Large Tap Button Component

```typescript
// components/ui/TapButton.tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';

interface TapButtonProps {
  icon: React.ReactNode;
  label: string;
  variant: 'success' | 'error' | 'neutral';
  onPress: () => void;
  disabled?: boolean;
  size?: 'medium' | 'large';
}

export function TapButton({
  icon,
  label,
  variant,
  onPress,
  disabled = false,
  size = 'large',
}: TapButtonProps) {
  const buttonSize = size === 'large' ? 120 : 80;
  const bgColor = {
    success: colors.success[500],
    error: colors.error[500],
    neutral: colors.neutral[200],
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: pressed ? `${bgColor}CC` : bgColor,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

## Accessibility Guidelines

1. **Touch Targets**: Minimum 48x48dp (we use 80-120dp for caregivers)
2. **Color Contrast**: 4.5:1 minimum for text
3. **Screen Reader**: All icons have `accessibilityLabel`
4. **Motion**: Respect `reduceMotion` preference
5. **Font Scaling**: Support dynamic type sizes

```typescript
// hooks/useAccessibility.ts
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

export function useAccessibility() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);

    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    const readerSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );

    return () => {
      motionSubscription.remove();
      readerSubscription.remove();
    };
  }, []);

  return { reduceMotion, screenReaderEnabled, colorScheme };
}
```

## File Structure

```
src/
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── index.ts
├── components/
│   ├── icons/
│   │   ├── index.tsx
│   │   ├── TaskIcons.tsx
│   │   ├── NavigationIcons.tsx
│   │   └── StatusIcons.tsx
│   └── ui/
│       ├── TapButton.tsx
│       ├── Card.tsx
│       └── Badge.tsx
└── hooks/
    └── useAccessibility.ts
```
