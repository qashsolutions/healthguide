// HealthGuide Careseeker/Elder Layout
// Stack navigator wrapping tabs and sub-routes

import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function CareseekerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="find-companion" />
      <Stack.Screen name="companion/[id]" />
      <Stack.Screen name="request-visit" />
      <Stack.Screen name="my-requests" />
      <Stack.Screen name="rate-visit" />
    </Stack>
  );
}
