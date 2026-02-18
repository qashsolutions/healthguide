// HealthGuide Caregiver Layout
// Stack navigator wrapping tabs, profile setup, and sub-routes

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function CaregiverLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [profileChecked, setProfileChecked] = useState(false);

  // Check if caregiver has completed their profile (caregiver_profiles record)
  useEffect(() => {
    if (!user?.id) return;

    async function checkProfile() {
      const { data } = await supabase
        .from('caregiver_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!data) {
        // No caregiver_profiles record — redirect to setup
        // Only redirect if not already on profile-setup
        const currentSegment = segments[segments.length - 1];
        if (currentSegment !== 'profile-setup') {
          router.replace('/(protected)/caregiver/profile-setup' as any);
        }
      }
      setProfileChecked(true);
    }

    checkProfile();
  }, [user?.id]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
