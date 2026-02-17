// HealthGuide Protected Layout
// Per healthguide-core/navigation skill - Role-based navigation

import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { SyncProvider, SyncStatusBar } from '@/components/sync';
import { useEffect } from 'react';

const roleToSegment: Record<string, string> = {
  agency_owner: 'agency',
  caregiver: 'caregiver',
  careseeker: 'careseeker',
  family_member: 'family',
};

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Redirect to correct role route after login
  useEffect(() => {
    if (loading || !user) return;

    const expectedSegment = roleToSegment[user.role] || 'agency';
    // segments[0] is "(protected)", segments[1] is the role folder
    const currentSegment = segments[1];

    if (currentSegment && currentSegment !== expectedSegment) {
      router.replace(`/(protected)/${expectedSegment}` as any);
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  // SyncProvider wraps all protected routes for offline support
  return (
    <SyncProvider caregiverId={user.role === 'caregiver' ? user.id : undefined}>
      <SyncStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="agency" />
        <Stack.Screen name="caregiver" />
        <Stack.Screen name="careseeker" />
        <Stack.Screen name="family" />
      </Stack>
    </SyncProvider>
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
