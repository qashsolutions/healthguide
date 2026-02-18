// HealthGuide Agency Owner Layout
// Stack navigator wrapping tabs and sub-routes

import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function AgencyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="caregiver-directory" />
      <Stack.Screen name="caregiver-profile-view" />
      <Stack.Screen name="rate-caregiver" />
      <Stack.Screen name="assignment" />
      <Stack.Screen name="caregiver" />
      <Stack.Screen name="elder" />
      <Stack.Screen name="elders" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
