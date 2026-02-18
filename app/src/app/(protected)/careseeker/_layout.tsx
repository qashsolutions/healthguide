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
      <Stack.Screen name="daily-check-in" />
      <Stack.Screen name="games" />
    </Stack>
  );
}
