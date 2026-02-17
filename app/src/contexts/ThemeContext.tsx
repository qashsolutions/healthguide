// HealthGuide Theme Context
// Provides light/dark mode color switching

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors as lightColors } from '@/theme/colors';
import { darkColors } from '@/theme/darkColors';

type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colors: typeof lightColors;
  colorScheme: ColorScheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  colorScheme: 'light',
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const colorScheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: colorScheme === 'dark' ? darkColors : lightColors,
      colorScheme,
      isDark: colorScheme === 'dark',
    }),
    [colorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
