---
name: healthguide-invite-delivery
description: Native OS Share Sheet and QR code based invite delivery for care groups. Eliminates third-party SMS dependencies. Combines deep linking, QR codes, and invite codes for seamless care group onboarding. All recurring notifications use Expo Push.
metadata:
  author: HealthGuide
  version: 3.0.0
  category: notifications
  tags: [share-sheet, qr-code, invite, care-group, onboarding, deep-link]
---

# HealthGuide Invite Delivery (Share Sheet + QR Code)

## Overview

Care group invitations are delivered via the native OS Share Sheet (iOS Share Sheet / Android Share Intent) with optional QR code generation. No third-party SMS provider is needed. The invite system leverages:

- **Native Share Sheet**: Built-in iOS/Android sharing with pre-filled invite messages and deep links
- **QR Codes**: Static QR codes encoding invite codes and care group details
- **Deep Links**: Automatic app launch with invitation context
- **Invite Codes**: User-friendly alphanumeric codes (6-8 characters) for manual entry
- **Expo Push**: All recurring notifications (check-in reminders, alerts, reports) use Expo Push Notifications (free tier)

This eliminates infrastructure costs while providing a frictionless onboarding experience.

## Use Cases

| Use Case | Delivery Method |
|----------|-----------------|
| Invite care group members | Native Share Sheet + QR code |
| Check-in reminders | Push (Expo, recurring) |
| Check-out alerts | Push (Expo, recurring) |
| Care reports | Push (Expo, recurring) |
| Emergency notifications | Push (Expo, recurring) |
| Invite code refresh | Share Sheet (on-demand) |

## Key Features

- **Native Share Sheet integration**: Share pre-formatted invitations via SMS, iMessage, email, WhatsApp, etc.
- **QR code generation**: Static QR codes for offline/in-person invitations
- **Deep linking**: App auto-launch with invitation context (`healthguide://join-care-group?code=ABC123`)
- **Invite code management**: Generate, track, and refresh invitation codes
- **Zero SMS costs**: No monthly SMS fees
- **Expo Push**: Free recurring notifications for all care group communication
- **Offline support**: QR codes work without internet

## Data Models

```typescript
// Care group with invite code and QR data
interface CareGroup {
  id: string;
  name: string;
  invite_code: string;  // 6-8 char alphanumeric code (UNIQUE)
  qr_code_data?: string; // Base64 encoded QR SVG
  qr_code_generated_at?: string;
  created_by: string; // User ID of care group creator
  created_at: string;
  updated_at: string;
}

// Care group membership (after invite accepted)
interface CareGroupMember {
  id: string;
  care_group_id: string;
  user_id: string;
  name: string;
  phone?: string;
  relationship?: string;
  role: 'member' | 'admin' | 'viewer';
  joined_at: string;
  invite_accepted_at?: string;
  push_token?: string; // For Expo Push
}

// Invitation tracking (optional - for audit trail)
interface InviteRecord {
  id: string;
  care_group_id: string;
  invite_code: string;
  shared_method: 'share-sheet' | 'qr-code' | 'link-copy'; // How it was shared
  shared_at: string;
  accepted_by?: string; // User ID if invite accepted
  accepted_at?: string;
  expires_at: string; // 30 days from creation
  status: 'pending' | 'accepted' | 'expired';
}
```

## Instructions

### Step 1: Invite Utility (Share Sheet + QR Code)

```typescript
// lib/invite.ts
import { Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CareGroup } from '@/types';

export interface InviteShareData {
  careGroupId: string;
  careGroupName: string;
  inviteCode: string;
  deepLink: string;
}

/**
 * Share an invitation via native Share Sheet
 * User can choose SMS, iMessage, email, WhatsApp, etc.
 */
export async function shareInvite(
  inviteData: InviteShareData,
  options?: {
    customMessage?: string;
    includeQRCode?: boolean;
  }
): Promise<{ success: boolean; method?: string }> {
  try {
    const message = options?.customMessage
      ? options.customMessage
      : buildInviteMessage(inviteData);

    const result = await Share.share({
      message: message,
      url: inviteData.deepLink, // iOS: can include deep link
      title: `Join ${inviteData.careGroupName} on HealthGuide`,
    });

    return {
      success: !result.didCancel,
      method: result.activityType || 'unknown',
    };
  } catch (error) {
    console.error('Share invite failed:', error);
    return { success: false };
  }
}

/**
 * Build invite message with code and app link
 */
function buildInviteMessage(inviteData: InviteShareData): string {
  return `You're invited to join "${inviteData.careGroupName}" on HealthGuide!

Use this code: ${inviteData.inviteCode}

Or tap to open the app: ${inviteData.deepLink}

HealthGuide helps coordinate care for people you love.`;
}

/**
 * Copy invite code to clipboard
 */
export async function copyInviteCode(code: string): Promise<void> {
  try {
    // Requires 'react-native-clipboard' or similar
    // const Clipboard = require('@react-native-clipboard/clipboard').default;
    // Clipboard.setString(code);
    console.log(`Invite code copied: ${code}`);
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

/**
 * Generate a shareable deep link for invitation
 */
export function buildInviteDeepLink(inviteCode: string): string {
  return `healthguide://join-care-group?code=${encodeURIComponent(inviteCode)}`;
}

/**
 * Parse invite code from deep link
 */
export function parseInviteCode(deepLink: string): string | null {
  const match = deepLink.match(/code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
```

### Step 2: QR Code Component

```typescript
// components/QRCodeComponent.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeComponentProps {
  inviteCode: string;
  careGroupName: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  onGenerated?: (qrSvg: string) => void;
}

/**
 * Render QR code for invitation
 * QR encodes: healthguide://join-care-group?code=ABC123
 */
export const QRCodeComponent: React.FC<QRCodeComponentProps> = ({
  inviteCode,
  careGroupName,
  size = 250,
  errorCorrectionLevel = 'H',
  onGenerated,
}) => {
  const deepLink = useMemo(
    () => `healthguide://join-care-group?code=${encodeURIComponent(inviteCode)}`,
    [inviteCode]
  );

  const qrRef = React.useRef(null);

  const handleQRGenerated = async () => {
    if (qrRef.current && onGenerated) {
      try {
        // Get SVG string representation
        // Note: react-native-qrcode-svg toDataURL() may vary by version
        qrRef.current.toDataURL?.((data: string) => {
          onGenerated(data);
        });
      } catch (error) {
        console.error('Failed to generate QR data:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <QRCode
        ref={qrRef}
        value={deepLink}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        errorCorrectionLevel={errorCorrectionLevel}
        quietZone={10}
        onError={(error) => console.error('QR Error:', error)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
```

### Step 3: Create Care Group Edge Function

```typescript
// supabase/functions/create-care-group/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface CreateCareGroupRequest {
  name: string;
  created_by: string; // User ID
  description?: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: CreateCareGroupRequest = await req.json();

    // Validate input
    if (!payload.name || !payload.created_by) {
      return new Response(
        JSON.stringify({ error: 'name and created_by are required' }),
        { status: 400 }
      );
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create care group
    const { data: careGroup, error: createError } = await supabase
      .from('care_groups')
      .insert({
        name: payload.name,
        description: payload.description,
        invite_code: inviteCode,
        created_by: payload.created_by,
      })
      .select()
      .single();

    if (createError) {
      console.error('Create care group error:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
      });
    }

    // Add creator as admin member
    await supabase.from('care_group_members').insert({
      care_group_id: careGroup.id,
      user_id: payload.created_by,
      role: 'admin',
      name: 'Creator', // Fetch from users table in production
      joined_at: new Date().toISOString(),
    });

    // Return care group with invite deep link
    const deepLink = `healthguide://join-care-group?code=${inviteCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        care_group: {
          id: careGroup.id,
          name: careGroup.name,
          invite_code: inviteCode,
          deep_link: deepLink,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
});

/**
 * Generate unique 6-character invite code
 * Avoids confusing characters: I, L, O, 0, 1
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

### Step 4: Refresh Invite Code

```typescript
// supabase/functions/refresh-invite-code/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RefreshInviteCodeRequest {
  care_group_id: string;
  user_id: string; // Verify user is admin
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: RefreshInviteCodeRequest = await req.json();

    // Verify user is care group admin
    const { data: member, error: memberError } = await supabase
      .from('care_group_members')
      .select('role')
      .eq('care_group_id', payload.care_group_id)
      .eq('user_id', payload.user_id)
      .single();

    if (memberError || member?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403 }
      );
    }

    // Generate new code
    const newCode = generateInviteCode();

    // Update care group
    const { data: updated, error: updateError } = await supabase
      .from('care_groups')
      .update({ invite_code: newCode })
      .eq('id', payload.care_group_id)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
      });
    }

    // Return new invite details
    const deepLink = `healthguide://join-care-group?code=${newCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite_code: newCode,
        deep_link: deepLink,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
});

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

### Step 5: Database Schema

```sql
-- supabase/migrations/021_care_groups_invite_delivery.sql

-- Care groups with invite codes
CREATE TABLE care_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  qr_code_data TEXT, -- Base64 encoded QR SVG
  qr_code_generated_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Care group membership
CREATE TABLE care_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_group_id UUID NOT NULL REFERENCES care_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- 'member', 'admin', 'viewer'
  push_token TEXT, -- Expo Push token
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invite_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(care_group_id, user_id)
);

-- Invite record audit trail (optional)
CREATE TABLE invite_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_group_id UUID NOT NULL REFERENCES care_groups(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  shared_method TEXT NOT NULL, -- 'share-sheet', 'qr-code', 'link-copy'
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'accepted', 'expired'
);

-- Indexes
CREATE INDEX idx_care_groups_created_by ON care_groups(created_by);
CREATE INDEX idx_care_groups_invite_code ON care_groups(invite_code);
CREATE INDEX idx_care_group_members_user_id ON care_group_members(user_id);
CREATE INDEX idx_care_group_members_care_group_id ON care_group_members(care_group_id);
CREATE INDEX idx_invite_records_care_group_id ON invite_records(care_group_id);
CREATE INDEX idx_invite_records_status ON invite_records(status);

-- RLS
ALTER TABLE care_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_records ENABLE ROW LEVEL SECURITY;

-- Care group creator can manage their care group
CREATE POLICY "Care group creator can view own group"
ON care_groups FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Care group members can view their group"
ON care_groups FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT care_group_id FROM care_group_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Only admins can update care group"
ON care_groups FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT care_group_id FROM care_group_members
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Members can view other members
CREATE POLICY "Members can view group members"
ON care_group_members FOR SELECT
TO authenticated
USING (
  care_group_id IN (
    SELECT care_group_id FROM care_group_members WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Track invite shares for audit
CREATE POLICY "Users can view invite records for their groups"
ON invite_records FOR SELECT
TO authenticated
USING (
  care_group_id IN (
    SELECT care_group_id FROM care_group_members WHERE user_id = auth.uid()
  )
);
```

## Deep Link Handling

Configure your app to handle invite deep links:

```typescript
// App.tsx or root navigation setup
import { Linking } from 'react-native';
import * as linking from '@react-native-firebase/dynamic-links'; // or alternatives

const linking = {
  prefixes: ['healthguide://', 'https://healthguide.app'],
  config: {
    screens: {
      JoinCareGroup: 'join-care-group?code=:inviteCode',
    },
  },
};

// In your app setup:
export default function App() {
  // Handle initial URL
  const [initialRoute, setInitialRoute] = React.useState<string | undefined>();

  React.useEffect(() => {
    const getInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url != null) {
        setInitialRoute(url);
      }
    };

    getInitialUrl();

    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  function handleDeepLink(url: string) {
    const parsed = Linking.parse(url);
    // Navigate to JoinCareGroup screen with inviteCode
  }

  return <NavigationContainer linking={linking}>{/* ... */}</NavigationContainer>;
}
```

## Cost Comparison

| Approach | Monthly Cost (100 care group members) |
|----------|--------------------------------------|
| **Old: Twilio SMS for invites** | ~$5-10/month (one SMS per member) |
| **New: Share Sheet + QR codes** | **$0/month** (zero infrastructure cost) |
| **Recurring notifications (Push)** | **FREE** (Expo Push free tier) |
| **Total savings** | **$60-120/year per 100 members** |

## Migration from SMS-based Invites

If migrating from Twilio SMS:

1. Generate invite codes for existing care groups
2. Update `family_members` table to `care_group_members`
3. Migrate invite codes from SMS records to `care_groups.invite_code`
4. Deploy new Share Sheet UI components
5. Register push tokens for all app users
6. Test deep linking with QR codes
7. Decommission Twilio account (save $20-50/month)

## Troubleshooting

### Share Sheet closed without sharing
**Cause:** User cancelled the share action
**Solution:** This is normal - offer retry button or copy code option

### QR code not scanning
**Cause:** Poor lighting, QR code size too small, or app not configured for deep links
**Solution:** Ensure QR is 250x250px minimum, test with multiple QR scanners, verify deep link routing in app

### Deep link not launching app
**Cause:** Incorrect URL scheme or missing deep link configuration
**Solution:** Verify `healthguide://` scheme configured in app.json/Info.plist, test with `adb shell am start` on Android or `xcrun simctl openurl` on iOS

### Invite code appears invalid after refresh
**Cause:** Stale code in UI or browser cache
**Solution:** Refetch invite code from API before sharing, disable QR caching

### User can't join with code
**Cause:** Expired invite code (30 days old) or typo in code entry
**Solution:** Regenerate new code via refresh-invite-code function, ensure alphanumeric entry is case-insensitive

### Push notifications not arriving
**Cause:** Missing expo-notifications setup or invalid push token
**Solution:** Ensure user granted notification permission, verify push token registered in `care_group_members.push_token`, check Expo Push logs
