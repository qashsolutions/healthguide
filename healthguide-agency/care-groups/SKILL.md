---
name: healthguide-agency-care-groups
description: Care group creation and management for HealthGuide agency owners. Create care groups per elder, invite caregivers, family members, and elders via share sheet/QR code. All members verify via phone OTP and receive push notifications. Use when building care group screens, invite flows, or member management.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [care-groups, invite, share-sheet, qr-code, onboarding]
---

# Care Groups Skill

## Overview

A **care group** is a collaborative unit centered around a single elder. It enables an agency owner to coordinate care by inviting caregivers, family members, and the elder themselves into a shared group where everyone can communicate, receive updates, and access relevant care information.

### Core Characteristics

- **One group per elder**: Each elder has exactly one associated care group (enforced by database constraint)
- **Fixed member slots**: 1 caregiver, up to 3 family members, and 1 elder (optional)
- **Single invite code**: Each group uses one 8-character invite code shared among all members
- **Invite delivery**: Via native OS Share Sheet (SMS, WhatsApp, email, iMessage) or QR code
- **Zero-cost verification**: Phone OTP verification (no Twilio dependency)
- **Push notifications**: All members receive real-time updates about group activity

### Key Business Value

- Simplifies onboarding by avoiding per-member invite links
- Reduces friction with native share UI and QR codes
- Ensures all members are verified before joining
- Maintains role-based permissions within the group

---

## Key Features

### 1. Care Group Creation
- Agency owner creates a care group for an elder
- Specifies member slots with name, phone number, and role
- System generates a unique 8-character invite code
- Care group is immediately active and ready for invitations

### 2. Invite Code Generation
- 8-character alphanumeric codes
- Excludes ambiguous characters (I, O, 0, 1) to prevent typos
- Expires after 7 days
- Can be refreshed to extend expiry by another 7 days
- Codes are case-insensitive

### 3. QR Code Integration
- QR code encodes the deep link: `healthguide://join/{code}`
- Scannable via device camera or QR reader apps
- Automatically opens the app and pre-fills invite code
- Works across iOS and Android

### 4. Native Share Sheet Integration
- One-tap sharing to SMS, WhatsApp, email, iMessage
- Platform-native UI (no custom dialogs)
- Message template: "Join my care group on HealthGuide: [invite code] or scan this QR code"
- Pre-populated with invite code and optional QR code image

### 5. Phone OTP Verification
- All members (caregiver, family, elder) verify phone number before joining
- OTP sent via SMS (no Twilio required — use native SMS or verification service)
- Once verified, member gains access to group content
- Phone verification is logged for compliance

### 6. Role-Based Access
- **Caregiver**: Full access, can view all member info, send messages, update care details
- **Family Member**: Can view shared updates, send messages to group
- **Elder**: Can receive messages, view updates, optional presence in group
- Permissions enforced at API level

### 7. Invite Code Refresh
- Agency owner can refresh the invite code at any time
- Extends expiry by 7 days from refresh date
- Old code becomes invalid immediately
- Useful if original code is compromised or expires soon

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ AGENCY OWNER                                                        │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ├─ Adds elder to agency
                       │
                       ├─ Creates care group for elder
                       │
                       ├─ Specifies member slots:
                       │  • Caregiver (name, phone)
                       │  • Family member 1-3 (name, phone)
                       │  • Elder (name, phone, optional)
                       │
                       ├─ System generates 8-char code
                       │  & QR code (deep link)
                       │
                       ├─ Shares via:
                       │  ├─ Native Share Sheet (SMS/WhatsApp/email/iMessage)
                       │  └─ Shows QR code for in-person sharing
                       │
                       └─ Group created & ready for invites

┌─────────────────────────────────────────────────────────────────────┐
│ MEMBER (Caregiver, Family, or Elder)                               │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ├─ Receives invite (SMS, WhatsApp, email, iMessage)
                       │  or is shown QR code in person
                       │
                       ├─ Opens HealthGuide app
                       │  ├─ Via deep link: healthguide://join/{code}
                       │  │  (code auto-filled)
                       │  └─ Via manual entry: enters code on join screen
                       │
                       ├─ Enters or verifies code
                       │
                       ├─ Selects their role from available slots
                       │
                       ├─ Enters phone number
                       │
                       ├─ Receives OTP via SMS
                       │
                       ├─ Enters OTP to verify
                       │
                       ├─ Joins group successfully
                       │
                       └─ Receives push notifications & can
                          access group content

```

---

## Data Models

### care_groups Table

```sql
CREATE TABLE care_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  elder_id UUID NOT NULL REFERENCES elders(id),
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  invite_code_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agency_id, elder_id)
);
```

### care_group_members Table

```sql
CREATE TABLE care_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_group_id UUID NOT NULL REFERENCES care_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  phone_number VARCHAR(20) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('caregiver', 'family_member', 'elder')),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript Interfaces

```typescript
// Core domain models
export interface CareGroup {
  id: string;
  agencyId: string;
  elderId: string;
  inviteCode: string;
  inviteCodeExpiresAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface CareGroupMember {
  id: string;
  careGroupId: string;
  userId?: string;
  phoneNumber: string;
  role: 'caregiver' | 'family_member' | 'elder';
  verified: boolean;
  verifiedAt?: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Request/Response types
export interface CreateCareGroupRequest {
  agencyId: string;
  elderId: string;
  members: Array<{
    name: string;
    phoneNumber: string;
    role: 'caregiver' | 'family_member' | 'elder';
  }>;
}

export interface JoinCareGroupRequest {
  inviteCode: string;
  phoneNumber: string;
  role: 'caregiver' | 'family_member' | 'elder';
  otp: string;
}

export interface RefreshInviteCodeRequest {
  careGroupId: string;
}

export interface InviteCodeResponse {
  careGroupId: string;
  inviteCode: string;
  expiresAt: string;
  qrCodeUrl?: string;
}
```

---

## Instructions

### Step 1: Database Schema

Reference file: `011_care_groups.sql`

Create the `care_groups` and `care_group_members` tables with the schemas shown above. Include:

- Foreign key constraints to `agencies`, `elders`, and `users` tables
- UNIQUE constraint on `(agency_id, elder_id)` to enforce one group per elder
- CHECK constraint on `role` to limit valid roles
- Triggers to enforce member count limits:
  - Max 1 caregiver per group
  - Max 3 family members per group
  - Max 1 elder per group

**Example Trigger for Caregiver Limit:**

```sql
CREATE OR REPLACE FUNCTION enforce_caregiver_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'caregiver' THEN
    IF (SELECT COUNT(*) FROM care_group_members
        WHERE care_group_id = NEW.care_group_id AND role = 'caregiver') >= 1 THEN
      RAISE EXCEPTION 'Care group can have at most 1 caregiver';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_caregiver_limit
BEFORE INSERT OR UPDATE ON care_group_members
FOR EACH ROW
EXECUTE FUNCTION enforce_caregiver_limit();
```

### Step 2: Edge Functions

Create two main Edge Functions:

#### create-care-group

**Purpose**: Create a new care group with member slots and generate invite code

**Handler**: `functions/create-care-group/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const {
    agencyId,
    elderId,
    members,
  }: {
    agencyId: string;
    elderId: string;
    members: Array<{ name: string; phoneNumber: string; role: string }>;
  } = await req.json();

  try {
    // Generate 8-character invite code (exclude ambiguous chars)
    const inviteCode = generateInviteCode();

    // Create care group
    const { data: careGroup, error: cgError } = await supabase
      .from('care_groups')
      .insert({
        agency_id: agencyId,
        elder_id: elderId,
        invite_code: inviteCode,
        invite_code_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select()
      .single();

    if (cgError) throw cgError;

    // Insert member slots
    const memberInserts = members.map((m) => ({
      care_group_id: careGroup.id,
      phone_number: m.phoneNumber,
      role: m.role,
    }));

    const { error: memberError } = await supabase
      .from('care_group_members')
      .insert(memberInserts);

    if (memberError) throw memberError;

    return new Response(
      JSON.stringify({
        careGroupId: careGroup.id,
        inviteCode: careGroup.invite_code,
        expiresAt: careGroup.invite_code_expires_at,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude I, O, 0, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

#### join-care-group

**Purpose**: Verify phone OTP and add member to care group

**Handler**: `functions/join-care-group/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const {
    inviteCode,
    phoneNumber,
    role,
    otp,
  }: {
    inviteCode: string;
    phoneNumber: string;
    role: string;
    otp: string;
  } = await req.json();

  try {
    // Verify OTP (integrate with your OTP service)
    const otpValid = await verifyOTP(phoneNumber, otp);
    if (!otpValid) {
      return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find care group by invite code
    const { data: careGroup, error: cgError } = await supabase
      .from('care_groups')
      .select('id, invite_code_expires_at')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (cgError || !careGroup) {
      return new Response(JSON.stringify({ error: 'Invalid invite code' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if code is expired
    if (new Date(careGroup.invite_code_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Invite code expired' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update member with verified status
    const { error: updateError } = await supabase
      .from('care_group_members')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .eq('care_group_id', careGroup.id)
      .eq('phone_number', phoneNumber)
      .eq('role', role);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        message: 'Successfully joined care group',
        careGroupId: careGroup.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
  // Integrate with your OTP verification service (Firebase Auth, etc.)
  // For now, returning true as placeholder
  return true;
}
```

### Step 3: Client Utilities

Create `lib/services/invite.ts` for invite code and QR code handling:

```typescript
import QRCode from 'qrcode';

/**
 * Generate deep link URL for joining a care group
 */
export function generateDeepLink(inviteCode: string): string {
  return `healthguide://join/${inviteCode.toUpperCase()}`;
}

/**
 * Generate QR code image for deep link
 */
export async function generateQRCodeImage(inviteCode: string): Promise<string> {
  const deepLink = generateDeepLink(inviteCode);
  const qrCodeDataUrl = await QRCode.toDataURL(deepLink, {
    width: 300,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
  return qrCodeDataUrl;
}

/**
 * Generate invite message for sharing
 */
export function generateInviteMessage(inviteCode: string): string {
  return `Join my care group on HealthGuide: ${inviteCode.toUpperCase()}`;
}

/**
 * Create shareable invite data
 */
export interface ShareableInvite {
  code: string;
  deepLink: string;
  message: string;
  qrCodeDataUrl?: string;
}

export async function createShareableInvite(
  inviteCode: string
): Promise<ShareableInvite> {
  const qrCodeDataUrl = await generateQRCodeImage(inviteCode);

  return {
    code: inviteCode.toUpperCase(),
    deepLink: generateDeepLink(inviteCode),
    message: generateInviteMessage(inviteCode),
    qrCodeDataUrl,
  };
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
```

### Step 4: UI Components

#### QRCode.tsx Component

```typescript
import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { generateQRCodeImage } from '@/lib/services/invite';

interface QRCodeProps {
  inviteCode: string;
  size?: number;
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({ inviteCode, size = 300 }) => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateQRCodeImage(inviteCode)
      .then(setQrImage)
      .finally(() => setLoading(false));
  }, [inviteCode]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {qrImage && (
        <Image
          source={{ uri: qrImage }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      )}
    </View>
  );
};
```

#### CareGroupCard.tsx Component

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CareGroup } from '@/types/care-groups';
import { formatPhoneNumber } from '@/lib/services/invite';

interface CareGroupCardProps {
  careGroup: CareGroup;
  onShare: (careGroup: CareGroup) => void;
  onDetails: (careGroup: CareGroup) => void;
}

export const CareGroupCard: React.FC<CareGroupCardProps> = ({
  careGroup,
  onShare,
  onDetails,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.inviteCode}>{careGroup.inviteCode}</Text>
        <Text style={styles.expiryLabel}>
          Expires: {new Date(careGroup.inviteCodeExpiresAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onShare(careGroup)}
        >
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => onDetails(careGroup)}
        >
          <Text style={styles.buttonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace',
  },
  expiryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

### Step 5: Agency Screens

#### care-group.tsx (List Screen)

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CareGroup } from '@/types/care-groups';
import { CareGroupCard } from '@/components/CareGroupCard';
import { supabase } from '@/lib/supabase';

export const CareGroupListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { agencyId } = route.params as { agencyId: string };

  const [careGroups, setCareGroups] = useState<CareGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareGroups();
  }, [agencyId]);

  const fetchCareGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_groups')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCareGroups(data);
    } catch (error) {
      console.error('Failed to fetch care groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (careGroup: CareGroup) => {
    try {
      const message = `Join my care group on HealthGuide: ${careGroup.inviteCode}`;
      await Share.share({
        message,
        title: 'Join Care Group',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDetails = (careGroup: CareGroup) => {
    navigation.navigate('CareGroupDetail', { careGroupId: careGroup.id });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={careGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CareGroupCard
            careGroup={item}
            onShare={handleShare}
            onDetails={handleDetails}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No care groups yet</Text>
        }
        refreshing={loading}
        onRefresh={fetchCareGroups}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCareGroup')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
```

#### care-group-detail.tsx (Detail Screen)

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CareGroup, CareGroupMember } from '@/types/care-groups';
import { QRCodeComponent } from '@/components/QRCode';
import { supabase } from '@/lib/supabase';

export const CareGroupDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { careGroupId } = route.params as { careGroupId: string };

  const [careGroup, setCareGroup] = useState<CareGroup | null>(null);
  const [members, setMembers] = useState<CareGroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupDetails();
  }, [careGroupId]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from('care_groups')
        .select('*')
        .eq('id', careGroupId)
        .single();

      if (groupError) throw groupError;
      setCareGroup(group);

      const { data: memberData, error: memberError } = await supabase
        .from('care_group_members')
        .select('*')
        .eq('care_group_id', careGroupId)
        .order('role');

      if (memberError) throw memberError;
      setMembers(memberData);
    } catch (error) {
      console.error('Failed to fetch group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCode = async () => {
    if (!careGroup) return;

    Alert.alert(
      'Refresh Invite Code',
      'This will invalidate the current code and extend expiry by 7 days',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            try {
              // Call refresh-invite-code edge function
              const response = await fetch(
                'https://YOUR_PROJECT.supabase.co/functions/v1/refresh-invite-code',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ careGroupId }),
                }
              );

              if (!response.ok) throw new Error('Failed to refresh code');
              await fetchGroupDetails();
              Alert.alert('Success', 'Invite code refreshed');
            } catch (error) {
              Alert.alert('Error', 'Failed to refresh code');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!careGroup) return;

    try {
      const message = `Join my care group on HealthGuide: ${careGroup.inviteCode}`;
      await Share.share({
        message,
        title: 'Join Care Group',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!careGroup) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite Code</Text>
        <Text style={styles.inviteCode}>{careGroup.inviteCode}</Text>
        <Text style={styles.expiryText}>
          Expires: {new Date(careGroup.inviteCodeExpiresAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>QR Code</Text>
        <QRCodeComponent inviteCode={careGroup.inviteCode} size={250} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        {members.map((member) => (
          <View key={member.id} style={styles.memberItem}>
            <View>
              <Text style={styles.memberRole}>{member.role}</Text>
              <Text style={styles.memberPhone}>{member.phoneNumber}</Text>
            </View>
            <View>
              {member.verified ? (
                <Text style={styles.verifiedBadge}>Verified</Text>
              ) : (
                <Text style={styles.pendingBadge}>Pending</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={handleShare}>
          <Text style={styles.buttonText}>Share Invite</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleRefreshCode}>
          <Text style={styles.buttonText}>Refresh Code</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inviteCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  memberPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  verifiedBadge: {
    backgroundColor: '#34C759',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Step 6: Universal Join Screen

#### join-group.tsx

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';

interface JoinGroupParams {
  code?: string; // Pre-filled from deep link
}

export const JoinGroupScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as JoinGroupParams | undefined;

  const [inviteCode, setInviteCode] = useState(params?.code || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<
    'caregiver' | 'family_member' | 'elder' | null
  >(null);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'code' | 'role' | 'phone' | 'otp'>('code');
  const [loading, setLoading] = useState(false);

  // Step 1: Validate invite code
  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_groups')
        .select('id, invite_code_expires_at')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Invalid invite code');
        return;
      }

      if (new Date(data.invite_code_expires_at) < new Date()) {
        Alert.alert('Error', 'Invite code has expired');
        return;
      }

      setStep('role');
    } catch (error) {
      Alert.alert('Error', 'Failed to validate code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Select role and check availability
  const handleSelectRole = async (role: 'caregiver' | 'family_member' | 'elder') => {
    setLoading(true);
    try {
      const { data: careGroup, error: cgError } = await supabase
        .from('care_groups')
        .select('id')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (cgError) throw cgError;

      const { data: members, error: memberError } = await supabase
        .from('care_group_members')
        .select('role')
        .eq('care_group_id', careGroup.id)
        .eq('role', role)
        .eq('verified', false);

      if (memberError) throw memberError;

      if (!members || members.length === 0) {
        Alert.alert('Error', `No available ${role} slots`);
        return;
      }

      setSelectedRole(role);
      setStep('phone');
    } catch (error) {
      Alert.alert('Error', 'Failed to select role');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Enter phone and request OTP
  const handleRequestOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      // Call send-otp edge function
      const response = await fetch(
        'https://YOUR_PROJECT.supabase.co/functions/v1/send-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber }),
        }
      );

      if (!response.ok) throw new Error('Failed to send OTP');

      setStep('otp');
      Alert.alert('Success', 'OTP sent to your phone');
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify OTP and join group
  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://YOUR_PROJECT.supabase.co/functions/v1/join-care-group',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: inviteCode.toUpperCase(),
            phoneNumber,
            role: selectedRole,
            otp,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to join group');

      Alert.alert('Success', 'Welcome to the care group!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 'code' && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Join Care Group</Text>
            <Text style={styles.subtitle}>Enter your invite code</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter 8-character code"
              placeholderTextColor="#999"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleValidateCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'role' && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Select Your Role</Text>
            <Text style={styles.subtitle}>Choose your role in this care group</Text>

            {(['caregiver', 'family_member', 'elder'] as const).map((role) => (
              <TouchableOpacity
                key={role}
                style={styles.roleButton}
                onPress={() => handleSelectRole(role)}
                disabled={loading}
              >
                <Text style={styles.roleButtonText}>
                  {role === 'family_member' ? 'Family Member' : role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'phone' && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Verify Phone Number</Text>
            <Text style={styles.subtitle}>Enter your phone number</Text>

            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>Check your text messages</Text>

            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Join</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
```

---

## Constraints

### Database Constraints

1. **Max 1 Caregiver per Group**
   - Enforced by database trigger `trg_enforce_caregiver_limit`
   - Attempting to add a second caregiver raises an exception

2. **Max 3 Family Members per Group**
   - Enforced by database trigger `trg_enforce_family_limit`
   - Attempting to add a fourth family member raises an exception

3. **Max 1 Elder per Group**
   - Enforced by database trigger `trg_enforce_elder_limit`
   - Attempting to add a second elder raises an exception

4. **One Care Group per Elder**
   - Enforced by UNIQUE constraint on `(agency_id, elder_id)`
   - Prevents duplicate groups for the same elder in the same agency

### Invite Code Constraints

5. **Invite Code Format**
   - Exactly 8 alphanumeric characters
   - Excludes I, O, 0, 1 (ambiguous characters)
   - Case-insensitive (stored as uppercase)
   - Must be unique across all care groups

6. **Invite Code Expiry**
   - Expires 7 days from creation
   - Can be refreshed to extend by another 7 days
   - Expired codes cannot be used to join

### Verification Constraints

7. **Phone Verification Required**
   - All members must verify phone number via OTP
   - Unverified members cannot access group content
   - Phone number must match the invited phone exactly

---

## Troubleshooting

### Issue: "Care group can have at most 1 caregiver"

**Cause**: Attempting to add a second caregiver to an existing group.

**Solution**:
- Check the group's current members to identify the existing caregiver
- Either remove the existing caregiver before adding a new one, or
- Add the new person as a family member instead

### Issue: "Invalid invite code"

**Cause**: Either the code doesn't exist or is case-sensitive mismatch.

**Solution**:
- Double-check the code (case doesn't matter, but all characters must be exact)
- Verify the code hasn't expired (check `invite_code_expires_at`)
- Refresh the code from the care group detail screen if it's near expiry

### Issue: "Invite code expired"

**Cause**: The code was created more than 7 days ago and hasn't been refreshed.

**Solution**:
- Agency owner should refresh the code using the "Refresh Code" button
- A refreshed code extends expiry by another 7 days
- Share the new code with members who haven't joined yet

### Issue: "No available caregiver slots"

**Cause**: The group already has a verified caregiver.

**Solution**:
- Verify if the current caregiver should be replaced
- If yes, contact the agency admin to remove the old caregiver first
- Then the new member can join as the caregiver

### Issue: "Invalid OTP"

**Cause**: Either the OTP was entered incorrectly or has expired (typically 10 minutes).

**Solution**:
- Ask the member to request a new OTP if theirs has expired
- Double-check the OTP from the SMS message
- Ensure the phone number entered matches the invited phone exactly

### Issue: Members not receiving SMS invites

**Cause**: Network issue, invalid phone number format, or SMS delivery service issue.

**Solution**:
- Use QR code as alternative delivery method
- Share the code verbally or via other messaging apps
- Verify phone number format (should be E.164: +1234567890)
- Check that the phone number is correctly formatted in the group member slot

### Issue: QR code not scanning

**Cause**: Poor lighting, damaged QR code, or device camera issue.

**Solution**:
- Ensure adequate lighting when scanning
- Try increasing QR code size on screen
- Use the invite code manually instead
- Alternatively, use the deep link directly: `healthguide://join/XXXXXXXX`

### Issue: Member joined but doesn't see group content

**Cause**: Member joined but hasn't loaded the group yet, or permissions aren't synced.

**Solution**:
- Have the member force-close and reopen the app
- Verify the member's `verified` status is `true` in the database
- Check that the member's role is correctly set
- Ensure the user is logged in with the correct phone number

---

## References

- Database Schema: `011_care_groups.sql`
- Edge Functions: `functions/create-care-group/`, `functions/join-care-group/`
- Client Utilities: `lib/services/invite.ts`
- UI Components: `components/QRCode.tsx`, `components/CareGroupCard.tsx`
- Agency Screens: `screens/care-group.tsx`, `screens/care-group-detail.tsx`
- Join Screen: `screens/join-group.tsx`
