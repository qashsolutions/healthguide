---
name: healthguide-agency-caregiver-mgmt
description: Caregiver management for HealthGuide agency owners. Add, edit, deactivate caregivers (max 15 per agency), manage profiles, certifications, and availability. Use when building caregiver list screens, add/edit forms, or caregiver detail views.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [caregivers, management, profiles, availability]
---

# HealthGuide Caregiver Management

## Overview
Agency owners can manage up to 15 caregivers. Each caregiver has a profile with contact info, certifications (unlicensed by default), availability, and assignment history.

## Caregiver Constraints

- Maximum 15 caregivers per agency
- Unlicensed caregivers cannot administer medications
- Caregivers use phone + PIN for easy app access
- Each caregiver belongs to exactly one agency

## Data Model

```typescript
// types/caregiver.ts
export interface Caregiver {
  id: string;
  agency_id: string;
  profile_id: string; // Links to auth profile

  // Personal info
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;

  // Status
  status: 'active' | 'inactive' | 'pending';
  is_licensed: boolean;
  license_number?: string;
  license_expiry?: string;

  // Capabilities (what tasks they can perform)
  capabilities: string[];

  // Availability
  availability: WeeklyAvailability;

  // Metadata
  hired_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "17:00"
}
```

## Instructions

### Step 1: Caregiver List Screen

```typescript
// app/(protected)/agency/(tabs)/caregivers.tsx
import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Caregiver } from '@/types/caregiver';
import { CaregiverCard } from '@/components/agency/CaregiverCard';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

const MAX_CAREGIVERS = 15;

export default function CaregiversScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCaregivers();
  }, []);

  async function fetchCaregivers() {
    const { data, error } = await supabase
      .from('caregivers')
      .select('*')
      .eq('agency_id', user!.agency_id)
      .order('full_name');

    if (data) setCaregivers(data);
    setLoading(false);
  }

  function handleAddCaregiver() {
    if (caregivers.length >= MAX_CAREGIVERS) {
      Alert.alert(
        'Limit Reached',
        `You can have up to ${MAX_CAREGIVERS} caregivers per agency.`
      );
      return;
    }
    router.push('/agency/caregiver/new');
  }

  const filteredCaregivers = caregivers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {caregivers.length} / {MAX_CAREGIVERS} Caregivers
        </Text>
        <Button
          title="+ Add Caregiver"
          onPress={handleAddCaregiver}
          disabled={caregivers.length >= MAX_CAREGIVERS}
        />
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search caregivers..."
      />

      <FlatList
        data={filteredCaregivers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaregiverCard
            caregiver={item}
            onPress={() => router.push(`/agency/caregiver/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchCaregivers}
        ListEmptyComponent={
          <Text style={styles.empty}>No caregivers yet</Text>
        }
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
  count: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 48,
  },
});
```

### Step 2: Caregiver Card Component

```typescript
// components/agency/CaregiverCard.tsx
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Caregiver } from '@/types/caregiver';
import { PersonIcon, PhoneIcon, CheckIcon } from '@/components/icons';

interface Props {
  caregiver: Caregiver;
  onPress: () => void;
}

export function CaregiverCard({ caregiver, onPress }: Props) {
  const statusColors = {
    active: '#10B981',
    inactive: '#EF4444',
    pending: '#F59E0B',
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        {caregiver.avatar_url ? (
          <Image source={{ uri: caregiver.avatar_url }} style={styles.avatarImage} />
        ) : (
          <PersonIcon size={32} color="#9CA3AF" />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{caregiver.full_name}</Text>
        <View style={styles.row}>
          <PhoneIcon size={14} color="#6B7280" />
          <Text style={styles.phone}>{caregiver.phone}</Text>
        </View>
        {caregiver.is_licensed && (
          <View style={styles.badge}>
            <CheckIcon size={12} color="#10B981" />
            <Text style={styles.badgeText}>Licensed</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.status,
          { backgroundColor: statusColors[caregiver.status] },
        ]}
      />
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
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  phone: {
    fontSize: 14,
    color: '#6B7280',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  status: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
```

### Step 3: Add/Edit Caregiver Form

```typescript
// app/(protected)/agency/caregiver/[id].tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Switch, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Caregiver, WeeklyAvailability } from '@/types/caregiver';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvailabilityPicker } from '@/components/agency/AvailabilityPicker';
import { CapabilitySelector } from '@/components/agency/CapabilitySelector';

const DEFAULT_CAPABILITIES = [
  'companionship',
  'meal_preparation',
  'light_housekeeping',
  'errands',
  'mobility_assistance',
  'personal_care',
  'medication_reminders', // NOT administration
];

export default function CaregiverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Caregiver>>({
    full_name: '',
    phone: '',
    email: '',
    is_licensed: false,
    capabilities: ['companionship', 'errands'],
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
    status: 'pending',
  });

  useEffect(() => {
    if (!isNew) {
      fetchCaregiver();
    }
  }, [id]);

  async function fetchCaregiver() {
    const { data } = await supabase
      .from('caregivers')
      .select('*')
      .eq('id', id)
      .single();

    if (data) setForm(data);
  }

  async function handleSave() {
    if (!form.full_name || !form.phone) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }

    setLoading(true);
    try {
      if (isNew) {
        // Create caregiver
        const { error } = await supabase.from('caregivers').insert({
          ...form,
          agency_id: user!.agency_id,
        });
        if (error) throw error;
      } else {
        // Update caregiver
        const { error } = await supabase
          .from('caregivers')
          .update(form)
          .eq('id', id);
        if (error) throw error;
      }

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Could not save caregiver');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    // Send SMS invitation to caregiver
    const { error } = await supabase.functions.invoke('invite-caregiver', {
      body: {
        phone: form.phone,
        caregiver_name: form.full_name,
        agency_id: user!.agency_id,
      },
    });

    if (error) {
      Alert.alert('Error', 'Could not send invitation');
    } else {
      Alert.alert('Success', 'Invitation sent!');
      setForm({ ...form, status: 'pending' });
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(text) => setForm({ ...form, full_name: text })}
          placeholder="Jane Smith"
        />

        <Input
          label="Phone Number"
          value={form.phone}
          onChangeText={(text) => setForm({ ...form, phone: text })}
          placeholder="+1 (555) 000-0000"
          keyboardType="phone-pad"
        />

        <Input
          label="Email (Optional)"
          value={form.email}
          onChangeText={(text) => setForm({ ...form, email: text })}
          placeholder="jane@example.com"
          keyboardType="email-address"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Licensed Caregiver</Text>
          <Switch
            value={form.is_licensed}
            onValueChange={(value) => setForm({ ...form, is_licensed: value })}
          />
        </View>

        {form.is_licensed && (
          <>
            <Input
              label="License Number"
              value={form.license_number}
              onChangeText={(text) => setForm({ ...form, license_number: text })}
            />
            <Input
              label="License Expiry"
              value={form.license_expiry}
              onChangeText={(text) => setForm({ ...form, license_expiry: text })}
              placeholder="MM/DD/YYYY"
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Capabilities</Text>
        <CapabilitySelector
          selected={form.capabilities || []}
          onChange={(capabilities) => setForm({ ...form, capabilities })}
          options={DEFAULT_CAPABILITIES}
          isLicensed={form.is_licensed}
        />

        <Text style={styles.sectionTitle}>Availability</Text>
        <AvailabilityPicker
          availability={form.availability!}
          onChange={(availability) => setForm({ ...form, availability })}
        />

        <View style={styles.actions}>
          <Button title="Save" onPress={handleSave} loading={loading} />

          {!isNew && form.status === 'inactive' && (
            <Button
              title="Send Invitation"
              variant="outline"
              onPress={handleInvite}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  form: {
    padding: 16,
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  actions: {
    gap: 12,
    marginTop: 24,
  },
});
```

### Step 4: Capability Selector Component

```typescript
// components/agency/CapabilitySelector.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CheckIcon } from '@/components/icons';

const CAPABILITY_LABELS: Record<string, string> = {
  companionship: 'Companionship',
  meal_preparation: 'Meal Preparation',
  light_housekeeping: 'Light Housekeeping',
  errands: 'Errands & Shopping',
  mobility_assistance: 'Mobility Assistance',
  personal_care: 'Personal Care',
  medication_reminders: 'Medication Reminders',
  medication_administration: 'Medication Administration', // Licensed only
};

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
  options: string[];
  isLicensed?: boolean;
}

export function CapabilitySelector({
  selected,
  onChange,
  options,
  isLicensed = false,
}: Props) {
  function toggleCapability(capability: string) {
    if (selected.includes(capability)) {
      onChange(selected.filter((c) => c !== capability));
    } else {
      onChange([...selected, capability]);
    }
  }

  // Add medication administration if licensed
  const allOptions = isLicensed
    ? [...options, 'medication_administration']
    : options;

  return (
    <View style={styles.container}>
      {allOptions.map((capability) => {
        const isSelected = selected.includes(capability);
        const isRestricted =
          capability === 'medication_administration' && !isLicensed;

        return (
          <Pressable
            key={capability}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
              isRestricted && styles.chipDisabled,
            ]}
            onPress={() => !isRestricted && toggleCapability(capability)}
            disabled={isRestricted}
          >
            {isSelected && <CheckIcon size={16} color="#FFFFFF" />}
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}
            >
              {CAPABILITY_LABELS[capability]}
            </Text>
          </Pressable>
        );
      })}

      {!isLicensed && (
        <Text style={styles.notice}>
          * Unlicensed caregivers cannot administer medications
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  chipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  notice: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginTop: 8,
    width: '100%',
  },
});
```

### Step 5: Availability Picker Component

```typescript
// components/agency/AvailabilityPicker.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { WeeklyAvailability, TimeSlot } from '@/types/caregiver';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const TIME_SLOTS = [
  { label: 'Morning', start: '06:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '18:00' },
  { label: 'Evening', start: '18:00', end: '22:00' },
];

interface Props {
  availability: WeeklyAvailability;
  onChange: (availability: WeeklyAvailability) => void;
}

export function AvailabilityPicker({ availability, onChange }: Props) {
  function toggleSlot(day: keyof WeeklyAvailability, slot: TimeSlot) {
    const daySlots = availability[day];
    const exists = daySlots.some(
      (s) => s.start === slot.start && s.end === slot.end
    );

    const newSlots = exists
      ? daySlots.filter((s) => s.start !== slot.start || s.end !== slot.end)
      : [...daySlots, slot];

    onChange({ ...availability, [day]: newSlots });
  }

  function isSelected(day: keyof WeeklyAvailability, slot: typeof TIME_SLOTS[0]) {
    return availability[day].some(
      (s) => s.start === slot.start && s.end === slot.end
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dayLabel} />
        {TIME_SLOTS.map((slot) => (
          <Text key={slot.label} style={styles.slotLabel}>
            {slot.label}
          </Text>
        ))}
      </View>

      {DAYS.map((day) => (
        <View key={day} style={styles.row}>
          <Text style={styles.dayLabel}>
            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
          </Text>
          {TIME_SLOTS.map((slot) => (
            <Pressable
              key={slot.label}
              style={[
                styles.slot,
                isSelected(day, slot) && styles.slotSelected,
              ]}
              onPress={() => toggleSlot(day, { start: slot.start, end: slot.end })}
            >
              {isSelected(day, slot) && (
                <View style={styles.selectedDot} />
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  dayLabel: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  slotLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
  },
  slot: {
    flex: 1,
    height: 36,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotSelected: {
    backgroundColor: '#DBEAFE',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
});
```

## Troubleshooting

### Caregiver can't log in after invitation
**Cause:** Phone number format mismatch
**Solution:** Normalize phone numbers to E.164 format (+1XXXXXXXXXX)

### Availability not saving
**Cause:** JSON serialization issue
**Solution:** Ensure availability is valid JSON before saving
