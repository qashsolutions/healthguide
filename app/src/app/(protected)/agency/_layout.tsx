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
    </Stack>
  );
}
