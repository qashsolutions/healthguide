// HealthGuide Root Layout
// Per healthguide-core/navigation skill
// Per frontend-design skill - loads distinctive fonts

import { useCallback, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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

function getRoleRoute(role: string): string {
  switch (role) {
    case 'agency_owner': return 'agency';
    case 'caregiver': return 'caregiver';
    case 'careseeker': return 'careseeker';
    case 'family_member': return 'family';
    default: return 'agency';
  }
}

function RootLayoutNav() {
  const { user, loading, initialized } = useAuth();
  const { fontsLoaded, fontError } = useHealthGuideFonts();
  const router = useRouter();
  const segments = useSegments();

  // Hide splash screen once fonts are loaded and auth is initialized
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && initialized) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  // Auth-based redirect (critical for web where URL doesn't auto-switch)
  useEffect(() => {
    if (!initialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      // Authenticated user on an auth page → redirect to their dashboard
      const roleRoute = getRoleRoute(user.role);
      router.replace(`/(protected)/${roleRoute}` as any);
    } else if (!user && !inAuthGroup && segments[0] === '(protected)') {
      // Unauthenticated user on a protected page → redirect to login
      router.replace('/(auth)' as any);
    }
  }, [user, initialized, fontsLoaded, segments]);

  // Show loading while fonts load or auth initializes
  // NOTE: `loading` intentionally excluded — setting it unmounts the entire
  // navigation Stack, destroying all navigation state (BUG-1). Individual
  // screens handle their own loading spinners via the `loading` value.
  if (!fontsLoaded || !initialized) {
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
