// HealthGuide Caregiver Layout
// Stack navigator wrapping tabs and sub-routes

import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function CaregiverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="visit" />
      <Stack.Screen name="visit-history" />
      <Stack.Screen name="community" />
      <Stack.Screen name="my-profile" />
      <Stack.Screen name="pending-invitations" />
    </Stack>
  );
}
