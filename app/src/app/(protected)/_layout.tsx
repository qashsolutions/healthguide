// HealthGuide Protected Layout
// Per healthguide-core/navigation skill - Role-based navigation

import { Redirect, Stack, useSegments, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { SyncProvider, SyncStatusBar } from '@/components/sync';
import { useEffect } from 'react';

function getRoleRoute(role: string): string {
  switch (role) {
    case 'agency_owner': return 'agency';
    case 'caregiver': return 'caregiver';
    case 'careseeker': return 'careseeker';
    case 'family_member': return 'family';
    default: return 'agency';
  }
}

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Role-based redirect: ensure user lands on their role's screens
  useEffect(() => {
    if (!user || loading) return;

    const roleRoute = getRoleRoute(user.role);
    const currentRoleSegment = segments[1]; // segments[0] = '(protected)'

    // If user is on wrong role route (or none), redirect to correct one
    if (!currentRoleSegment || !['agency', 'caregiver', 'careseeker', 'family', 'notifications'].includes(currentRoleSegment)) {
      router.replace(`/(protected)/${roleRoute}` as any);
    } else if (currentRoleSegment !== roleRoute && currentRoleSegment !== 'notifications') {
      router.replace(`/(protected)/${roleRoute}` as any);
    }
  }, [user, loading, segments]);

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
        <Stack.Screen name="notifications" />
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
