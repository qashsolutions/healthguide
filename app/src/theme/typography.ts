// HealthGuide Typography System
// Per healthguide-core/theming skill - optimized for elder care readability
// Per frontend-design skill - distinctive fonts (NOT Inter/Roboto)

export const typography = {
  // Font families - distinctive choices for healthcare context
  // Plus Jakarta Sans: Modern, warm, highly readable for body text
  // Fraunces: Distinctive display font with personality
  // JetBrains Mono: Clean monospace for data/stats
  fontFamily: {
    // Body text - warm and readable
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semibold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
    // Display text - distinctive headings
    display: 'Fraunces-SemiBold',
    displayBold: 'Fraunces-Bold',
    // Monospace - for stats, numbers, codes
    mono: 'JetBrainsMono-Regular',
    monoBold: 'JetBrainsMono-Bold',
    // Fallbacks for before fonts load
    system: 'System',
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
    '5xl': 48,
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Pre-built text styles
  styles: {
    // Headings
    h1: {
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
    },
    h2: {
      fontSize: 30,
      fontWeight: '600' as const,
      lineHeight: 38,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },

    // Body text
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 28,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },

    // Labels & captions
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },

    // Buttons
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    buttonLarge: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
  },

  // Caregiver-specific (larger for easy reading during visits)
  caregiver: {
    heading: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    body: {
      fontSize: 20,
      fontWeight: '500' as const,
      lineHeight: 30,
    },
    label: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    taskLabel: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
  },

  // Elder/Careseeker-specific (extra large for accessibility)
  elder: {
    heading: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    body: {
      fontSize: 24,
      fontWeight: '500' as const,
      lineHeight: 36,
    },
    button: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
  },
} as const;

export type TextStyle = keyof typeof typography.styles;
