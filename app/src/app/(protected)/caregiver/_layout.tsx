// HealthGuide Caregiver Layout
// Stack navigator wrapping tabs, profile setup, and sub-routes
// Routes to type-specific profile setup if profile incomplete

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

  useEffect(() => {
    if (!user?.id) return;

    async function checkProfile() {
      const { data } = await supabase
        .from('caregiver_profiles')
        .select('id, profile_completed, caregiver_type')
        .eq('user_id', user!.id)
        .maybeSingle();

      const currentSegment = segments[segments.length - 1];
      const isOnSetup = currentSegment === 'profile-setup'
        || currentSegment === 'profile-setup-student'
        || currentSegment === 'profile-setup-companion';

      if (!data || !data.profile_completed) {
        // No profile or incomplete — route to type-specific setup
        if (!isOnSetup) {
          const type = data?.caregiver_type
            || (user as any)?.user_metadata?.caregiver_type
            || 'professional';

          if (type === 'student') {
            router.replace('/(protected)/caregiver/profile-setup-student' as any);
          } else if (type === 'companion_55') {
            router.replace('/(protected)/caregiver/profile-setup-companion' as any);
          } else {
            router.replace('/(protected)/caregiver/profile-setup' as any);
          }
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
      <Stack.Screen name="profile-setup-student" />
      <Stack.Screen name="profile-setup-companion" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="agencies-near-me" />
      <Stack.Screen name="rate-visit" />
      <Stack.Screen name="recurring-setup" />
    </Stack>
  );
}
