// HealthGuide Family Member Signup Screen
// DEPRECATED: This screen now redirects to the universal join-group screen.
// Kept for backward compatibility with old deep links using ?invite= parameter.
// All new invitations use the care group system via /(auth)/join-group.

import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function FamilySignupScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const router = useRouter();

  // If an invite code was provided via deep link, redirect to join-group with it
  // Otherwise, redirect to the join-group screen without a code
  useEffect(() => {
    const target = invite
      ? `/(auth)/join-group?invite=${invite}`
      : '/(auth)/join-group';

    // Use replace so user can't navigate back to this deprecated screen
    router.replace(target as any);
  }, [invite]);

  // Show a brief loading state while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  text: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
});
