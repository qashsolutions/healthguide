// HealthGuide Color System
// Per healthguide-core/theming skill - Trust & Care palette
// Per frontend-design skill - distinctive, committed color choices (NOT generic Tailwind)

export const colors = {
  // Primary - Deep Teal: Trust, calm, healthcare, distinctive
  // Avoids generic blue (#3B82F6) and purple gradients
  primary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#0D9488', // Main primary - Deep Teal
    600: '#0F766E',
    700: '#115E59',
    800: '#134E4A',
    900: '#042F2E',
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

  // Info - Information & Family
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral - Text & Backgrounds
  neutral: {
    50: '#F8FAFC',
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

  // Semantic colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: {
    primary: '#18181B',
    secondary: '#52525B',
    tertiary: '#71717A',
    disabled: '#A1A1AA',
    inverse: '#FFFFFF',
  },
} as const;

// Role-specific accent colors - distinctive, committed choices
// 4 roles: Agency Owner, Caregiver, Careseeker (Elder), Family
export const roleColors = {
  agency_owner: '#0F766E', // Deep Teal - management authority (matches primary)
  caregiver: '#059669',    // Emerald - trust & care
  careseeker: '#D97706',   // Amber - warmth for elders
  family: '#2563EB',       // Blue - monitoring & connection
} as const;

export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type UserRole = keyof typeof roleColors;
