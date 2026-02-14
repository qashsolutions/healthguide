---
name: healthguide-agency-careseeker-mgmt
description: Careseeker (elder) management for HealthGuide agency owners. Add elders, manage profiles, create and manage care groups (1 caregiver + up to 3 family + 1 elder), and handle handshake process. Use when building elder list screens, profile forms, or care group management.
metadata:
  author: HealthGuide
  version: 2.0.0
  category: agency
  tags: [careseekers, elders, care-groups, management]
---

# HealthGuide Careseeker Management

## Overview
Agency owners manage careseekers (elders) who receive care. For each elder, the agency owner creates a care group that includes 1 caregiver, up to 3 family members, and the elder themselves. Members are invited to join via share sheet or QR code, and all members need the app to receive push notifications about caregiver check-ins/outs and daily reports.

## Key Features

- Add/edit careseeker profiles
- Create and manage care groups (1 caregiver + up to 3 family + 1 elder)
- Handshake process with careseeker or family member
- Task selection (what care is needed)
- Care preferences and notes
- Share invites via native Share Sheet and QR code

## Data Model

```typescript
// types/careseeker.ts
export interface Careseeker {
  id: string;
  agency_id: string;
  profile_id?: string; // Optional - if careseeker uses app

  // Personal info
  full_name: string;
  preferred_name?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;

  // Address (for EVV verification)
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;

  // Care details
  care_needs: string[];        // Selected tasks
  medical_notes?: string;      // Non-medical observations only
  emergency_contact?: string;
  emergency_phone?: string;

  // Preferences
  preferred_caregiver_id?: string;
  caregiver_gender_preference?: 'male' | 'female' | 'no_preference';
  language_preference?: string;
  special_instructions?: string;

  // Status
  status: 'active' | 'inactive' | 'pending_handshake';
  handshake_completed: boolean;
  handshake_date?: string;
  handshake_with?: 'careseeker' | 'family_member';

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface FamilyContact {
  id: string;
  careseeker_id: string;

  full_name: string;
  relationship: string; // 'son', 'daughter', 'spouse', etc.
  phone: string;        // Required for SMS
  email?: string;

  // Notification preferences
  notify_check_in: boolean;
  notify_check_out: boolean;
  notify_daily_report: boolean;

  is_primary: boolean;  // Primary contact for urgent matters
  created_at: string;
}
```

## Instructions

### Step 1: Careseeker List Screen

```typescript
// app/(protected)/agency/(tabs)/careseekers.tsx
import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Careseeker } from '@/types/careseeker';
import { CareseekerCard } from '@/components/agency/CareseekerCard';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

export default function CareseekerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [careseekers, setCareseekers] = useState<Careseeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCareseekers();
  }, []);

  async function fetchCareseekers() {
    const { data, error } = await supabase
      .from('careseekers')
      .select(`
        *,
        family_contacts(count)
      `)
      .eq('agency_id', user!.agency_id)
      .order('full_name');

    if (data) setCareseekers(data);
    setLoading(false);
  }

  const filtered = careseekers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingHandshake = careseekers.filter(
    (c) => !c.handshake_completed
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Elders</Text>
          {pendingHandshake > 0 && (
            <Text style={styles.pending}>
              {pendingHandshake} pending handshake
            </Text>
          )}
        </View>
        <Button
          title="+ Add Elder"
          onPress={() => router.push('/agency/careseeker/new')}
        />
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search elders..."
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CareseekerCard
            careseeker={item}
            onPress={() => router.push(`/agency/careseeker/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchCareseekers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pending: {
    fontSize: 14,
    color: '#F59E0B',
  },
  list: {
    padding: 16,
    gap: 12,
  },
});
```

### Step 2: Careseeker Card Component

```typescript
// components/agency/CareseekerCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Careseeker } from '@/types/careseeker';
import { PersonIcon, LocationIcon, AlertIcon } from '@/components/icons';

interface Props {
  careseeker: Careseeker;
  onPress: () => void;
}

export function CareseekerCard({ careseeker, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <PersonIcon size={32} color="#3B82F6" />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>
          {careseeker.preferred_name || careseeker.full_name}
        </Text>
        <View style={styles.row}>
          <LocationIcon size={14} color="#6B7280" />
          <Text style={styles.address}>
            {careseeker.city}, {careseeker.state}
          </Text>
        </View>
        <Text style={styles.tasks}>
          {careseeker.care_needs.length} care tasks
        </Text>
      </View>

      {!careseeker.handshake_completed && (
        <View style={styles.alert}>
          <AlertIcon size={20} color="#F59E0B" />
          <Text style={styles.alertText}>Handshake</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
  },
  tasks: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  alert: {
    alignItems: 'center',
    gap: 4,
  },
  alertText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '500',
  },
});
```

### Step 3: Add/Edit Careseeker Form

```typescript
// app/(protected)/agency/careseeker/[id].tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Careseeker } from '@/types/careseeker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CareNeedsSelector } from '@/components/agency/CareNeedsSelector';
import { FamilyContactsList } from '@/components/agency/FamilyContactsList';

export default function CareseekerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Careseeker>>({
    full_name: '',
    preferred_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    care_needs: ['companionship'],
    caregiver_gender_preference: 'no_preference',
    status: 'pending_handshake',
    handshake_completed: false,
  });

  useEffect(() => {
    if (!isNew) fetchCareseeker();
  }, [id]);

  async function fetchCareseeker() {
    const { data } = await supabase
      .from('careseekers')
      .select('*')
      .eq('id', id)
      .single();

    if (data) setForm(data);
  }

  async function handleSave() {
    if (!form.full_name || !form.address) {
      Alert.alert('Error', 'Name and address are required');
      return;
    }

    setLoading(true);
    try {
      // Geocode address for EVV
      const coords = await geocodeAddress(
        `${form.address}, ${form.city}, ${form.state} ${form.zip_code}`
      );

      const dataToSave = {
        ...form,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('careseekers')
          .insert({
            ...dataToSave,
            agency_id: user!.agency_id,
          })
          .select()
          .single();

        if (error) throw error;

        // Navigate to add family contacts
        router.replace(`/agency/careseeker/${data.id}/family`);
      } else {
        const { error } = await supabase
          .from('careseekers')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Could not save elder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.section}>Personal Information</Text>

        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(text) => setForm({ ...form, full_name: text })}
          placeholder="John Smith"
        />

        <Input
          label="Preferred Name"
          value={form.preferred_name}
          onChangeText={(text) => setForm({ ...form, preferred_name: text })}
          placeholder="Johnny"
        />

        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(text) => setForm({ ...form, phone: text })}
          keyboardType="phone-pad"
        />

        <Text style={styles.section}>Address (Required for EVV)</Text>

        <Input
          label="Street Address"
          value={form.address}
          onChangeText={(text) => setForm({ ...form, address: text })}
        />

        <View style={styles.row}>
          <Input
            label="City"
            value={form.city}
            onChangeText={(text) => setForm({ ...form, city: text })}
            style={styles.flex1}
          />
          <Input
            label="State"
            value={form.state}
            onChangeText={(text) => setForm({ ...form, state: text })}
            style={styles.stateInput}
          />
          <Input
            label="ZIP"
            value={form.zip_code}
            onChangeText={(text) => setForm({ ...form, zip_code: text })}
            style={styles.zipInput}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.section}>Care Needs</Text>
        <CareNeedsSelector
          selected={form.care_needs || []}
          onChange={(care_needs) => setForm({ ...form, care_needs })}
        />

        <Text style={styles.section}>Special Instructions</Text>
        <Input
          value={form.special_instructions}
          onChangeText={(text) =>
            setForm({ ...form, special_instructions: text })
          }
          multiline
          numberOfLines={4}
          placeholder="Any special care instructions..."
        />

        {!isNew && (
          <>
            <Text style={styles.section}>Family Contacts</Text>
            <FamilyContactsList careseekerld={id} />
          </>
        )}

        <Button
          title={isNew ? 'Save & Add Family Contacts' : 'Save Changes'}
          onPress={handleSave}
          loading={loading}
        />
      </View>
    </ScrollView>
  );
}

async function geocodeAddress(address: string) {
  // Use Expo Location or a geocoding service
  try {
    const Location = await import('expo-location');
    const results = await Location.geocodeAsync(address);
    return results[0];
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  form: {
    padding: 16,
    gap: 12,
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  stateInput: {
    width: 80,
  },
  zipInput: {
    width: 100,
  },
});
```

### Step 4: Family Contacts Management

```typescript
// components/agency/FamilyContactsList.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { FamilyContact } from '@/types/careseeker';
import { FamilyContactCard } from './FamilyContactCard';
import { FamilyContactForm } from './FamilyContactForm';
import { Button } from '@/components/ui/Button';

const MAX_FAMILY_CONTACTS = 3;

interface Props {
  careseekerId: string;
}

export function FamilyContactsList({ careseekerId }: Props) {
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<FamilyContact | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [careseekerId]);

  async function fetchContacts() {
    const { data } = await supabase
      .from('family_contacts')
      .select('*')
      .eq('careseeker_id', careseekerId)
      .order('is_primary', { ascending: false });

    if (data) setContacts(data);
  }

  function handleAddContact() {
    if (contacts.length >= MAX_FAMILY_CONTACTS) {
      Alert.alert(
        'Limit Reached',
        `Maximum ${MAX_FAMILY_CONTACTS} family contacts per elder.`
      );
      return;
    }
    setEditingContact(null);
    setShowForm(true);
  }

  async function handleSaveContact(contact: Partial<FamilyContact>) {
    if (editingContact) {
      await supabase
        .from('family_contacts')
        .update(contact)
        .eq('id', editingContact.id);
    } else {
      await supabase.from('family_contacts').insert({
        ...contact,
        careseeker_id: careseekerId,
      });
    }

    setShowForm(false);
    fetchContacts();
  }

  async function handleDeleteContact(contactId: string) {
    Alert.alert(
      'Remove Contact',
      'This contact will no longer receive notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('family_contacts')
              .delete()
              .eq('id', contactId);
            fetchContacts();
          },
        },
      ]
    );
  }

  if (showForm) {
    return (
      <FamilyContactForm
        contact={editingContact}
        onSave={handleSaveContact}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {contacts.length} / {MAX_FAMILY_CONTACTS} Contacts
        </Text>
        <Button
          title="+ Add"
          size="small"
          onPress={handleAddContact}
          disabled={contacts.length >= MAX_FAMILY_CONTACTS}
        />
      </View>

      {contacts.length === 0 ? (
        <Text style={styles.empty}>
          Add family contacts to receive notifications
        </Text>
      ) : (
        contacts.map((contact) => (
          <FamilyContactCard
            key={contact.id}
            contact={contact}
            onEdit={() => {
              setEditingContact(contact);
              setShowForm(true);
            }}
            onDelete={() => handleDeleteContact(contact.id)}
          />
        ))
      )}

      <Text style={styles.note}>
        Family contacts receive SMS notifications for check-ins,
        check-outs, and daily care reports. They do not need the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontSize: 14,
    color: '#6B7280',
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 24,
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
```

### Step 5: Handshake Process

```typescript
// components/agency/HandshakeButton.tsx
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

interface Props {
  careseekerId: string;
  onComplete: () => void;
}

export function HandshakeButton({ careseekerId, onComplete }: Props) {
  const [loading, setLoading] = useState(false);

  function handleHandshake() {
    Alert.alert(
      'Complete Handshake',
      'Who is confirming the care agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Elder (Careseeker)',
          onPress: () => completeHandshake('careseeker'),
        },
        {
          text: 'Family Member',
          onPress: () => completeHandshake('family_member'),
        },
      ]
    );
  }

  async function completeHandshake(with_whom: 'careseeker' | 'family_member') {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('careseekers')
        .update({
          handshake_completed: true,
          handshake_date: new Date().toISOString(),
          handshake_with: with_whom,
          status: 'active',
        })
        .eq('id', careseekerId);

      if (error) throw error;

      Alert.alert('Success', 'Handshake completed! Care can now begin.');
      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Could not complete handshake');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      title="Complete Handshake"
      variant="primary"
      onPress={handleHandshake}
      loading={loading}
    />
  );
}
```

### Step 6: Care Group Creation

```typescript
// app/(protected)/agency/elder/[id]/care-group.tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, Share, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CareGroupCard } from '@/components/agency/CareGroupCard';
import { Button } from '@/components/ui/Button';
import { QRCode } from '@/components/ui/QRCode';

interface CareGroupMember {
  id: string;
  user_id: string;
  role: 'caregiver' | 'family_member' | 'elder';
  full_name: string;
  avatar_url?: string;
  status: 'active' | 'invited' | 'declined';
}

export default function CareGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [caregroup, setCaregroup] = useState<{
    id: string;
    careseeker_id: string;
    share_code: string;
    members: CareGroupMember[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchCareGroup();
  }, [id]);

  async function fetchCareGroup() {
    const { data } = await supabase
      .from('care_groups')
      .select(`
        id,
        careseeker_id,
        share_code,
        care_group_members (
          id,
          user_id,
          role,
          full_name,
          avatar_url,
          status
        )
      `)
      .eq('careseeker_id', id)
      .single();

    if (data) {
      setCaregroup({
        ...data,
        members: data.care_group_members || [],
      });
    }
    setLoading(false);
  }

  async function handleShareInvite() {
    if (!caregroup?.share_code) return;

    try {
      const inviteUrl = `https://healthguide.app/join-care-group/${caregroup.share_code}`;
      await Share.share({
        message: `Join our care group on HealthGuide: ${inviteUrl}`,
        title: 'Join Care Group',
        url: inviteUrl,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share invite');
    }
  }

  const activeMembers = caregroup?.members.filter(
    (m) => m.status === 'active'
  ) || [];
  const invitedMembers = caregroup?.members.filter(
    (m) => m.status === 'invited'
  ) || [];
  const caregiverCount = activeMembers.filter(
    (m) => m.role === 'caregiver'
  ).length;
  const familyCount = activeMembers.filter(
    (m) => m.role === 'family_member'
  ).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Care Group</Text>
        <Text style={styles.subtitle}>
          {caregiverCount} caregiver · {familyCount} family members
        </Text>
      </View>

      {caregroup && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Members</Text>
            {activeMembers.length === 0 ? (
              <Text style={styles.empty}>
                No active members yet. Share the invitation below.
              </Text>
            ) : (
              activeMembers.map((member) => (
                <CareGroupCard key={member.id} member={member} />
              ))
            )}
          </View>

          {invitedMembers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Invites</Text>
              {invitedMembers.map((member) => (
                <CareGroupCard key={member.id} member={member} pending />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Invite</Text>
            {showQR && caregroup.share_code && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={`https://healthguide.app/join-care-group/${caregroup.share_code}`}
                  size={200}
                />
                <Text style={styles.qrText}>
                  Scan to join this care group
                </Text>
              </View>
            )}
            <Button
              title={showQR ? 'Hide QR Code' : 'Show QR Code'}
              variant="secondary"
              onPress={() => setShowQR(!showQR)}
            />
            <Button
              title="Share Invite Link"
              onPress={handleShareInvite}
              style={styles.shareButton}
            />
          </View>

          <Text style={styles.note}>
            Members will receive push notifications when you add or modify care
            assignments. Use the native Share Sheet to send invites via email,
            message, or other apps.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 24,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  qrText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  shareButton: {
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    padding: 16,
    marginBottom: 16,
  },
});

// components/agency/CareGroupCard.tsx
interface CareGroupCardProps {
  member: CareGroupMember;
  pending?: boolean;
}

export function CareGroupCard({ member, pending }: CareGroupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.image} />
        ) : (
          <PersonIcon size={24} color="#3B82F6" />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{member.full_name}</Text>
        <Text style={styles.role}>
          {member.role === 'caregiver'
            ? 'Caregiver'
            : member.role === 'family_member'
              ? 'Family Member'
              : 'Elder'}
        </Text>
        {pending && <Text style={styles.pending}>Pending Response</Text>}
      </View>
    </View>
  );
}
```

## Caregiver Marketplace Directory

Agency owners can discover and connect with independent caregivers through the marketplace directory, in addition to managing their own caregiver roster.

### Directory Access

From the agency dashboard, tap the "Find Caregivers" quick-action card to open the searchable directory at `app/(protected)/agency/caregiver-directory.tsx`.

### Search & Filters

- **Zip code:** Enter 5-digit zip (exact) or 3-digit prefix (~50-mile area)
- **Availability:** Filter by day and time slot (morning, afternoon, evening)
- **Verified only:** Toggle to show only NPI-verified caregivers
- **Max rate:** Set hourly rate ceiling

Results are paginated (20 per page) and ordered by NPI verification status (verified first), then by newest profiles.

### Caregiver Profile View

Tap a caregiver card to view their full profile at `app/(protected)/agency/caregiver-profile-view.tsx`:

- Photo, name, and NPI verified badge
- **Ratings section:** RatingSummary (full mode with top tags) + "Rate This Caregiver" button + "View All Reviews" modal
- Zip code, hourly rate
- Certifications and capabilities (skill chips)
- 3x7 availability grid (days x time slots)
- Experience summary and bio
- **Call** and **Text** buttons (opens native dialer/messages via `Linking.openURL`)

Contact happens offline. There is no in-app messaging between agency owners and caregivers.

### Adding Directory Caregivers to Care Groups

After contacting a caregiver offline and confirming interest:

1. Agency owner creates or edits a care group for an elder
2. Adds the caregiver by phone number
3. System looks up `caregiver_profiles` by phone and links the profile
4. Caregiver receives a push notification requesting consent
5. Caregiver must **Accept** before being activated in the care group
6. On acceptance, a `caregiver_agency_links` record is created (supports multi-agency)

Care group detail view shows consent badges:
- **Pending** (amber) — awaiting caregiver response
- **Joined** (green) — caregiver accepted
- **Declined** (red) — caregiver declined (option to invite another)

### Related Files

| File | Purpose |
|------|---------|
| `app/(protected)/agency/caregiver-directory.tsx` | Searchable directory screen (with rating badges) |
| `app/(protected)/agency/caregiver-profile-view.tsx` | Full profile detail view (with ratings section) |
| `app/(protected)/agency/rate-caregiver.tsx` | Rating submission screen |
| `app/(protected)/agency/(tabs)/index.tsx` | Dashboard with "Find Caregivers" card |
| `app/supabase/functions/search-caregivers/index.ts` | Directory search edge function |
| `app/supabase/functions/public-caregiver-search/index.ts` | Public web directory search (no auth) |
| `app/supabase/functions/create-care-group/index.ts` | Consent flow on caregiver add |
| `app/supabase/migrations/012_caregiver_marketplace.sql` | Marketplace tables and RLS |
| `app/supabase/migrations/013_caregiver_ratings.sql` | Ratings table, triggers, aggregates |

---

## Troubleshooting

### Geocoding fails for address
**Cause:** Address format incorrect or service unavailable
**Solution:** Ensure address is complete and valid; add fallback to manual coordinates

### Care group member not receiving notifications
**Cause:** Push notification permissions not granted or user offline
**Solution:** Verify push notification setup on device settings and ensure user has app installed with notifications enabled. Members must have the app installed and grant notification permissions.

## Deprecations

### FamilyContactsList Component
The `FamilyContactsList` component and associated `family_contacts` table pattern are deprecated in favor of care groups. Care groups provide a more unified approach to managing all participants (caregivers, family members, and elders) in a single care circle with push notifications for all members.

For new implementations, use the `CareGroupCard` component at `app/(protected)/agency/elder/[id]/care-group.tsx` instead.
