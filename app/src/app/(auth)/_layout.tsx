// HealthGuide Auth Layout
// Handles login, registration, OTP verification, caregiver signup, and group join flows

import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="phone-login" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="caregiver-signup" />
      <Stack.Screen name="caregiver-profile-setup" />
      <Stack.Screen name="join-group" />
      <Stack.Screen name="family-signup" />
    </Stack>
  );
}
