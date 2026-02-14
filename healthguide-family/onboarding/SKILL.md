---
name: healthguide-care-group-onboarding
description: Care group creation and unified join flow for all roles (caregiver, family_member, elder). Replaces SMS-based family invitations with QR codes and deep links. All roles verify via phone OTP and join through the same join-group screen. Uses Expo Push notifications (free) instead of Twilio SMS.
metadata:
  author: HealthGuide
  version: 2.0.0
  category: onboarding
  tags: [care-group, onboarding, deep-links, qr-codes, phone-otp, push-notifications]
---

# HealthGuide Care Group Onboarding

## Overview

The Care Group system enables agency owners to create groups of people (caregivers, family members, and elders) who share access to an elder's care data. Family members and elders join ONLY through the "I have an invite code" path on the landing screen — they do not have direct signup options. The agency owner creates a care group for each elder and shares an 8-character invite code via the native Share Sheet or QR code. Users verify their phone number via Supabase OTP and are matched to their pending membership record. Push notifications via Expo replace SMS/email as the primary notification method.

**Landing screen change (v2.0):** The landing screen now shows 3 options: Agency Owner (login/register), Caregiver (marketplace signup), and "I have an invite code" (family/elder). Family members and elders no longer have direct login paths — they enter exclusively via invite codes shared by the agency owner.

**Caregiver consent (v2.0):** Caregivers are now added to care groups by the agency owner and must explicitly Accept or Decline via a consent flow. Caregivers sign up independently through the marketplace (see `healthguide-caregiver/marketplace/SKILL.md`) and are discovered by agency owners through the searchable directory.

## Key Features

- Agency owner creates care groups per elder (no manual member setup required)
- Unified join flow for all roles via `/(auth)/join-group.tsx`
- 8-character invite code shared with the entire care group
- QR code generation for easy sharing
- Deep links: `healthguide://join/{invite_code}` and `https://healthguide.app/join/{invite_code}`
- OS Share Sheet (Share.share()) for native sharing
- All roles verify identity via Supabase phone OTP
- Automatic role assignment based on invite parameters
- Push notifications via Expo Push (free, no Twilio required)
- Real-time presence and activity tracking
- Configurable notification preferences

## User Flow

```
Agency owner creates care group
       ↓
Care group assigned invite code + QR
       ↓
Share via native Share Sheet or QR scan
       ↓
User taps deep link or scans QR → App opens with invite_code
       ↓
User selects role (caregiver, family_member, or elder)
       ↓
User enters phone number
       ↓
Supabase sends OTP via SMS
       ↓
User verifies OTP
       ↓
User added to care_group_members
       ↓
Device token registered for Expo Push
       ↓
Role-specific home screen loaded
```

## Data Models

```typescript
interface CareGroup {
  id: string;
  agency_id: string;
  elder_id: string;
  invite_code: string; // 8-character unique code
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface CareGroupMember {
  id: string;
  care_group_id: string;
  user_id: string; // Links to auth.users
  role: 'caregiver' | 'family_member' | 'elder';
  joined_at: string;
  notification_preferences: NotificationPreferences;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationPreferences {
  check_in: boolean;
  check_out: boolean;
  daily_report: boolean;
  daily_report_time: string; // HH:MM format
  timezone: string;
  urgent_alerts: boolean;
  push_enabled: boolean;
}

interface DeviceToken {
  id: string;
  user_id: string;
  token: string; // Expo push token
  platform: 'ios' | 'android';
  last_used_at: string;
  created_at: string;
}

// DEPRECATED (use care_groups and care_group_members instead)
interface FamilyMember {
  // ... old schema - do not use for new code
}

interface FamilyInvitation {
  // ... old schema - do not use for new code
}
```

## Instructions

### Step 1: Database Schema for Care Groups

```sql
-- supabase/migrations/010_care_groups.sql

-- Care groups table
CREATE TABLE care_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  -- Invite management
  invite_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_care_groups_agency ON care_groups(agency_id);
CREATE INDEX idx_care_groups_elder ON care_groups(elder_id);
CREATE INDEX idx_care_groups_invite_code ON care_groups(invite_code);
CREATE INDEX idx_care_groups_expires ON care_groups(expires_at);

-- Care group members table
CREATE TABLE care_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_group_id UUID NOT NULL REFERENCES care_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role in this care group
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'family_member', 'elder')),

  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "check_in": true,
    "check_out": true,
    "daily_report": true,
    "daily_report_time": "19:00",
    "timezone": "America/New_York",
    "urgent_alerts": true,
    "push_enabled": true
  }'::jsonb,

  last_seen_at TIMESTAMPTZ,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(care_group_id, user_id)
);

CREATE INDEX idx_care_group_members_group ON care_group_members(care_group_id);
CREATE INDEX idx_care_group_members_user ON care_group_members(user_id);
CREATE INDEX idx_care_group_members_role ON care_group_members(role);

-- Device tokens for push notifications
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Expo push token
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),

  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, token)
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);

-- RLS for care_groups
ALTER TABLE care_groups ENABLE ROW LEVEL SECURITY;

-- Agency owners can manage care groups for their elders
CREATE POLICY "Agency owners can manage care groups"
ON care_groups FOR ALL
TO authenticated
USING (
  agency_id IN (
    SELECT agency_id FROM user_profiles WHERE id = auth.uid() AND role = 'agency_owner'
  )
);

-- RLS for care_group_members
ALTER TABLE care_group_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own membership
CREATE POLICY "Members can view own membership"
ON care_group_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Members can update their own notification preferences
CREATE POLICY "Members can update own preferences"
ON care_group_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Agency owners can view/manage members of their care groups
CREATE POLICY "Agency owners can manage members"
ON care_group_members FOR ALL
TO authenticated
USING (
  care_group_id IN (
    SELECT id FROM care_groups
    WHERE agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid() AND role = 'agency_owner'
    )
  )
);

-- RLS for device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own device tokens
CREATE POLICY "Users can manage own tokens"
ON device_tokens FOR ALL
TO authenticated
USING (user_id = auth.uid());
```

### Step 2: Create Care Group Edge Function

```typescript
// supabase/functions/create-care-group/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface CreateGroupRequest {
  elder_id: string;
  agency_id: string;
}

serve(async (req) => {
  const { elder_id, agency_id }: CreateGroupRequest = await req.json();

  // Verify agency_id matches user's agency
  const authHeader = req.headers.get('Authorization')!;
  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'agency_owner' || profile.agency_id !== agency_id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
    });
  }

  // Generate unique 8-character invite code
  const inviteCode = generateInviteCode();

  // Create care group (expires in 30 days)
  const { data: careGroup, error } = await supabase
    .from('care_groups')
    .insert({
      elder_id,
      agency_id,
      invite_code: inviteCode,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      care_group_id: careGroup.id,
      invite_code: careGroup.invite_code,
      expires_at: careGroup.expires_at,
      deep_link: `healthguide://join/${careGroup.invite_code}`,
      web_link: `https://healthguide.app/join/${careGroup.invite_code}`,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

### Step 3: Join Care Group Edge Function

```typescript
// supabase/functions/join-care-group/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface JoinGroupRequest {
  invite_code: string;
  role: 'caregiver' | 'family_member' | 'elder';
}

serve(async (req) => {
  const { invite_code, role }: JoinGroupRequest = await req.json();

  const authHeader = req.headers.get('Authorization')!;
  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  // Find care group by invite code (must not be expired)
  const { data: careGroup, error: groupError } = await supabase
    .from('care_groups')
    .select('*')
    .eq('invite_code', invite_code.toUpperCase())
    .gt('expires_at', new Date().toISOString())
    .single();

  if (groupError || !careGroup) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired invite code' }),
      { status: 400 }
    );
  }

  // Check family_member limit (max 3 per care group)
  if (role === 'family_member') {
    const { count } = await supabase
      .from('care_group_members')
      .select('*', { count: 'exact', head: true })
      .eq('care_group_id', careGroup.id)
      .eq('role', 'family_member');

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: 'Maximum family members reached for this care group' }),
        { status: 400 }
      );
    }
  }

  // Add user to care group
  const { data: member, error: joinError } = await supabase
    .from('care_group_members')
    .insert({
      care_group_id: careGroup.id,
      user_id: user.id,
      role,
      notification_preferences: {
        check_in: true,
        check_out: true,
        daily_report: true,
        daily_report_time: '19:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        urgent_alerts: true,
        push_enabled: true,
      },
    })
    .select()
    .single();

  if (joinError) {
    // If member already exists, just return success
    if (joinError.code === '23505') {
      const { data: existing } = await supabase
        .from('care_group_members')
        .select('*')
        .eq('care_group_id', careGroup.id)
        .eq('user_id', user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          care_group_id: careGroup.id,
          role: existing?.role,
          already_member: true,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: joinError.message }), {
      status: 400,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      care_group_id: careGroup.id,
      member_id: member.id,
      role,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Step 4: Universal Join Screen

```typescript
// app/(auth)/join-group.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/ui/OTPInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { registerForPushNotifications } from '@/lib/notifications';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

type JoinStep = 'code' | 'role' | 'phone' | 'verify' | 'success';
type UserRole = 'caregiver' | 'family_member' | 'elder';

export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();

  const [step, setStep] = useState<JoinStep>('code');
  const [inviteCode, setInviteCode] = useState(code?.toUpperCase() || '');
  const [selectedRole, setSelectedRole] = useState<UserRole>('caregiver');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [careGroupInfo, setCareGroupInfo] = useState<any>(null);

  const roles: UserRole[] = ['caregiver', 'family_member', 'elder'];
  const roleLabels: Record<UserRole, string> = {
    caregiver: 'Caregiver',
    family_member: 'Family Member',
    elder: 'Elder',
  };

  // Auto-validate if invite code provided in deep link
  useEffect(() => {
    if (code) {
      validateInviteCode(code.toUpperCase());
    }
  }, [code]);

  async function validateInviteCode(codeToValidate: string) {
    setLoading(true);

    // Query care group by invite code
    const { data, error } = await supabase
      .from('care_groups')
      .select(`
        *,
        elder:elders(first_name, last_name)
      `)
      .eq('invite_code', codeToValidate)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      Alert.alert('Invalid Code', 'This invite code is invalid or has expired. Please try again.');
      setLoading(false);
      return;
    }

    setCareGroupInfo(data);
    setStep('role');
    setLoading(false);
  }

  async function sendVerificationCode() {
    if (phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      Alert.alert('Error', 'Could not send verification code. Please try again.');
    } else {
      setStep('verify');
    }

    setLoading(false);
  }

  async function verifyAndJoin() {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (authError || !authData.user) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      setLoading(false);
      return;
    }

    // Call join-care-group edge function
    const { data: joinResult, error: joinError } = await supabase.functions.invoke('join-care-group', {
      body: {
        invite_code: inviteCode,
        role: selectedRole,
      },
      headers: {
        Authorization: `Bearer ${authData.session?.access_token}`,
      },
    });

    if (joinError || !joinResult?.success) {
      Alert.alert('Error', joinResult?.error || 'Failed to join care group.');
      setLoading(false);
      return;
    }

    // Register device token for push notifications
    try {
      await registerForPushNotifications(authData.user.id, selectedRole);
    } catch (pushError) {
      console.warn('Push notification registration failed:', pushError);
      // Don't fail the join if push fails
    }

    setStep('success');
    setLoading(false);

    // Navigate to role-specific home after delay
    setTimeout(() => {
      if (selectedRole === 'caregiver') {
        router.replace('/(protected)/caregiver/(tabs)');
      } else if (selectedRole === 'family_member') {
        router.replace('/(protected)/family/(tabs)');
      } else {
        router.replace('/(protected)/elder/(tabs)');
      }
    }, 2000);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 'code' && (
          <View style={styles.content}>
            <Text style={styles.title}>Join Care Group</Text>
            <Text style={styles.subtitle}>
              Enter the 8-character invite code from your invitation
            </Text>

            <Input
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="ABCD1234"
              autoCapitalize="characters"
              maxLength={8}
              style={styles.codeInput}
            />

            <Button
              title="Continue"
              onPress={() => validateInviteCode(inviteCode)}
              loading={loading}
              disabled={inviteCode.length !== 8}
            />
          </View>
        )}

        {step === 'role' && careGroupInfo && (
          <View style={styles.content}>
            <Text style={styles.title}>Select Your Role</Text>
            <Text style={styles.subtitle}>
              You're joining the care group for {careGroupInfo.elder.first_name} {careGroupInfo.elder.last_name}
            </Text>

            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>What is your relationship?</Text>
              <SegmentedControl
                values={roles.map((r) => roleLabels[r])}
                selectedIndex={roles.indexOf(selectedRole)}
                onChange={(index) => setSelectedRole(roles[index])}
                style={styles.roleSelector}
              />
            </View>

            <Text style={styles.roleDescription}>
              {selectedRole === 'caregiver' && 'You can check in/out, complete tasks, and manage daily care activities.'}
              {selectedRole === 'family_member' && 'You will receive notifications about check-ins, check-outs, and daily care reports.'}
              {selectedRole === 'elder' && 'You can view your care schedule and receive notifications about visits.'}
            </Text>

            <Button
              title="Continue"
              onPress={() => setStep('phone')}
            />
          </View>
        )}

        {step === 'phone' && (
          <View style={styles.content}>
            <Text style={styles.title}>Verify Your Phone</Text>
            <Text style={styles.subtitle}>
              We'll send a verification code to confirm your identity
            </Text>

            <Text style={styles.label}>Phone Number</Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Button
              title="Send Verification Code"
              onPress={sendVerificationCode}
              loading={loading}
              disabled={phone.length < 10}
            />
          </View>
        )}

        {step === 'verify' && (
          <View style={styles.content}>
            <Text style={styles.title}>Verify Your Phone</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {phone}
            </Text>

            <OTPInput
              value={otp}
              onChange={setOtp}
              length={6}
            />

            <Button
              title="Complete Setup"
              onPress={verifyAndJoin}
              loading={loading}
              disabled={otp.length !== 6}
              style={styles.verifyButton}
            />

            <Button
              title="Resend Code"
              variant="outline"
              onPress={sendVerificationCode}
            />
          </View>
        )}

        {step === 'success' && (
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Welcome!</Text>
            <Text style={styles.successSubtitle}>
              You've successfully joined the care group. You'll receive notifications about care updates.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'center',
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  input: {
    marginBottom: spacing[6],
  },
  roleSection: {
    marginBottom: spacing[6],
  },
  roleLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  roleSelector: {
    marginBottom: spacing[4],
  },
  roleDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[6],
    fontStyle: 'italic',
  },
  verifyButton: {
    marginBottom: spacing[3],
  },
  successContent: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  successEmoji: {
    fontSize: 48,
    color: colors.white,
  },
  successTitle: {
    ...typography.styles.h2,
    color: colors.success[600],
    marginBottom: spacing[2],
  },
  successSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
```

### Step 5: Family Signup Redirect (Backward Compatibility)

```typescript
// app/(auth)/family-signup.tsx
// DEPRECATED: This file is kept for backward compatibility only.
// All users should use join-group.tsx instead.

import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FamilySignupScreen() {
  const router = useRouter();
  const { invite } = useLocalSearchParams<{ invite?: string }>();

  useEffect(() => {
    // Redirect to the new join-group screen
    router.replace({
      pathname: '/(auth)/join-group',
      params: { code: invite || '' },
    });
  }, []);

  return null;
}
```

### Step 6: Push Notification Registration

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

export async function registerForPushNotifications(
  userId: string,
  role: 'caregiver' | 'family_member' | 'elder'
): Promise<void> {
  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Push notification permissions not granted');
      return;
    }

    // Get Expo push token
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = data;

    // Get platform
    const platform = Platform.OS as 'ios' | 'android';

    // Save device token to database
    const { error } = await supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        token,
        platform,
        last_used_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to register device token:', error);
    }
  } catch (error) {
    console.error('Push notification registration failed:', error);
  }
}

export function setupNotificationHandlers(): void {
  // Handle incoming notifications
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // Handle notification response (when user taps notification)
  Notifications.addNotificationResponseReceivedListener((response) => {
    const { data } = response.notification.request.content;
    // Handle navigation based on notification data
    console.log('Notification tapped:', data);
  });
}
```

## Troubleshooting

### Invite code not working
**Cause:** Code expired (30-day limit) or does not exist
**Solution:** Agency owner should create a new care group and share the new invite code

### "Maximum family members reached"
**Cause:** Care group already has 3 family members
**Solution:** Family members should be removed from the care group before adding new ones, or a separate care group can be created

### Push notifications not received
**Cause:** Device token not registered or Expo push service issue
**Solution:** Check that notification permissions are granted in app settings. Restart app and verify device token is registered in `device_tokens` table.

### User already a member error
**Cause:** User tried to join same care group twice
**Solution:** User is already a member - they can navigate to their home screen directly

### Deep link not working
**Cause:** Invite code format incorrect or deep link handler not configured
**Solution:** Ensure `healthguide://join/{invite_code}` is registered in `app.json` and scheme is configured correctly. Test with `https://healthguide.app/join/{invite_code}` as fallback.

### Role mismatch
**Cause:** User selected wrong role during join
**Solution:** For now, user must be manually removed from care_group_members and rejoin with correct role (future: allow role reassignment)

## Migration from Old System

The old `family_members` and `family_invitations` tables are deprecated. To migrate:

1. Create care groups for each elder with existing family members
2. Use the new edge functions for new invitations
3. Old family-signup.tsx automatically redirects to join-group.tsx
4. Keep old tables for backward compatibility but do not create new records

Example migration:
```sql
-- Create care groups for existing elders with family members
INSERT INTO care_groups (agency_id, elder_id, invite_code, expires_at)
SELECT
  fm.agency_id,
  fm.elder_id,
  generate_invite_code(),
  NOW() + INTERVAL '30 days'
FROM (
  SELECT DISTINCT agency_id, elder_id FROM family_members
) fm;

-- Migrate family members to care group members
INSERT INTO care_group_members (care_group_id, user_id, role, joined_at)
SELECT
  cg.id,
  fm.user_id,
  'family_member',
  fm.created_at
FROM family_members fm
JOIN care_groups cg ON fm.elder_id = cg.elder_id AND fm.agency_id = cg.agency_id
WHERE fm.user_id IS NOT NULL;
```
