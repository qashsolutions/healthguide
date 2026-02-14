// HealthGuide Visit Flow Layout
// Per healthguide-core/navigation skill - Linear visit flow

import { Stack } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';

export default function VisitLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent accidental back during visit
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="qr-checkin" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="check-out" />
    </Stack>
  );
}
