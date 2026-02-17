// HealthGuide Dark Mode Color Palette
// Slate backgrounds, inverted neutrals, same primary/semantic colors

import { colors as lightColors, roleColors } from './colors';

export const darkColors = {
  // Primary - Same Deep Teal
  primary: lightColors.primary,

  // Success - Same green
  success: lightColors.success,

  // Error - Same red
  error: lightColors.error,

  // Warning - Same amber
  warning: lightColors.warning,

  // Info - Same blue
  info: lightColors.info,

  // Neutral - Inverted for dark mode
  neutral: {
    50: '#1E293B',   // Was lightest, now dark (surface variant)
    100: '#1E293B',  // Card borders
    200: '#334155',  // Dividers
    300: '#475569',  // Subtle borders
    400: '#64748B',  // Placeholder text
    500: '#94A3B8',  // Secondary text
    600: '#CBD5E1',  // Primary text light
    700: '#E2E8F0',  // Strong text
    800: '#F1F5F9',  // Near-white
    900: '#F8FAFC',  // Brightest
  },

  // Semantic colors - Dark mode
  white: '#FFFFFF',
  black: '#000000',
  background: '#0F172A',  // Slate 900 - deepest dark
  surface: '#1E293B',     // Slate 800 - card/surface
  text: {
    primary: '#F1F5F9',   // Slate 100 - bright text
    secondary: '#CBD5E1', // Slate 300 - medium text
    tertiary: '#94A3B8',  // Slate 400 - subtle text
    disabled: '#64748B',  // Slate 500 - disabled
    inverse: '#0F172A',   // Dark text on light bg
  },
} as const;

// Role colors stay the same in dark mode
export { roleColors };
