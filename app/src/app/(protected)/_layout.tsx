// HealthGuide Protected Layout
// Per healthguide-core/navigation skill - Role-based navigation

import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { SyncProvider, SyncStatusBar } from '@/components/sync';

export default function ProtectedLayout() {
  const { user, loading } = useAuth();

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
