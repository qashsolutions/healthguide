// HealthGuide Spacing System
// Per healthguide-core/theming skill - consistent spacing scale

import { Platform, type ViewStyle } from 'react-native';

export const spacing = {
  // Base spacing scale (4px increments)
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
} as const;

// Touch target sizes per accessibility guidelines
export const touchTargets = {
  // Minimum per WCAG (48dp)
  minimum: 48,
  // Standard for most interactive elements
  standard: 56,
  // Caregiver-optimized (larger for quick taps)
  caregiver: 72,
  // Elder-optimized (extra large for accessibility)
  elder: 96,
  // Large action buttons
  action: 120,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Shadow utility - returns platform-appropriate shadow styles
// On web: uses boxShadow (CSS). On native: uses shadow* props.
function hexToRgba(hex: string, opacity: number): string {
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function createShadow(
  offsetY: number,
  opacity: number,
  blurRadius: number,
  elevation: number,
  color: string = '#000',
): ViewStyle {
  if (Platform.OS === 'web') {
    const rgba = hexToRgba(color, opacity);
    return { boxShadow: `0px ${offsetY}px ${blurRadius}px ${rgba}` } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blurRadius,
    elevation,
  };
}

// Shadows — softer, more refined
export const shadows = {
  none: createShadow(0, 0, 0, 0),
  sm: createShadow(1, 0.04, 3, 1),
  md: createShadow(2, 0.06, 8, 3),
  lg: createShadow(4, 0.08, 16, 5),
  xl: createShadow(8, 0.12, 24, 8),
};

// Tinted shadow — role-colored shadow for cards
export function createTintedShadow(color: string): ViewStyle {
  return createShadow(4, 0.12, 16, 5, color);
}

// Layout tokens — consistent section spacing
export const layout = {
  sectionGap: 24,
  screenPadding: 16,
  cardGap: 12,
} as const;

export type SpacingKey = keyof typeof spacing;
export type TouchTargetKey = keyof typeof touchTargets;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
