// HealthGuide Root Layout
// Per healthguide-core/navigation skill
// Per frontend-design skill - loads distinctive fonts

import { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { View, ActivityIndicator, StyleSheet, LogBox, Platform } from 'react-native';
import { colors } from '@/theme/colors';
import { useHealthGuideFonts } from '@/lib/fonts';

// Suppress noisy warnings from dependencies (dev only)
if (__DEV__) {
  // react-native-web View emits this for JSX whitespace between elements
  const origError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('A text node cannot be a child of a <View>')) return;
    origError(...args);
  };

  // react-native-reanimated / dependency warnings
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) return;
    origWarn(...args);
  };

  if (Platform.OS !== 'web') {
    LogBox.ignoreLogs([
      'A text node cannot be a child of a <View>',
      'props.pointerEvents is deprecated',
    ]);
  }
}

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
    </View>
  );
}

function RootLayoutNav() {
  const { user, loading, initialized } = useAuth();
  const { fontsLoaded, fontError } = useHealthGuideFonts();

  // Hide splash screen once fonts are loaded and auth is initialized
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && initialized) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  // Show loading while fonts load or auth initializes
  if (!fontsLoaded || !initialized || loading) {
    return <LoadingScreen />;
  }

  // Log font error if any (non-blocking)
  if (fontError) {
    console.warn('Font loading error:', fontError);
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        )}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
