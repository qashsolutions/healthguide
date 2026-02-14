// HealthGuide Font Loading
// Per frontend-design skill - distinctive fonts (NOT Inter/Roboto)
// Uses Plus Jakarta Sans, Fraunces, and JetBrains Mono

import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

/**
 * Load HealthGuide custom fonts.
 * Uses distinctive fonts per frontend-design skill guidelines.
 */
export function useHealthGuideFonts() {
  const [fontsLoaded, fontError] = useFonts({
    // Plus Jakarta Sans - Body text (warm, readable)
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,

    // Fraunces - Display headings (distinctive, personality)
    'Fraunces-SemiBold': Fraunces_600SemiBold,
    'Fraunces-Bold': Fraunces_700Bold,

    // JetBrains Mono - Stats, numbers, codes
    'JetBrainsMono-Regular': JetBrainsMono_400Regular,
    'JetBrainsMono-Bold': JetBrainsMono_700Bold,
  });

  return { fontsLoaded, fontError };
}

// Font family names for use in styles
export const fontFamilies = {
  // Body text
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',

  // Display headings
  display: 'Fraunces-SemiBold',
  displayBold: 'Fraunces-Bold',

  // Monospace
  mono: 'JetBrainsMono-Regular',
  monoBold: 'JetBrainsMono-Bold',

  // System fallback
  system: 'System',
} as const;
