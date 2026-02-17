// HealthGuide Caregiver Detail/Edit Screen
// Per healthguide-agency/caregiver-mgmt skill

import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Card } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { CheckIcon } from '@/components/icons';

interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

interface TimeSlot {
  start: string;
  end: string;
}

interface CaregiverForm {
  full_name: string;
  phone: string;
  email: string;
  is_licensed: boolean;
  license_number: string;
  license_expiry: string;
  capabilities: string[];
  availability: WeeklyAvailability;
  status: 'active' | 'inactive' | 'pending';
  notes: string;
}

const DEFAULT_CAPABILITIES = [
  'companionship',
  'meal_preparation',
  'light_housekeeping',
  'errands',
  'mobility_assistance',
  'personal_care',
  'medication_reminders',
];

const CAPABILITY_LABELS: Record<string, string> = {
  companionship: 'Companionship',
  meal_preparation: 'Meal Preparation',
  light_housekeeping: 'Light Housekeeping',
  errands: 'Errands & Shopping',
  mobility_assistance: 'Mobility Assistance',
  personal_care: 'Personal Care',
  medication_reminders: 'Medication Reminders',
  medication_administration: 'Medication Administration',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const TIME_SLOTS = [
  { label: 'Morning', start: '06:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '18:00' },
  { label: 'Evening', start: '18:00', end: '22:00' },
];

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export default function CaregiverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CaregiverForm>({
    full_name: '',
    phone: '',
    email: '',
    is_licensed: false,
    license_number: '',
    license_expiry: '',
    capabilities: ['companionship', 'errands'],
    availability: DEFAULT_AVAILABILITY,
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    if (!isNew) {
      fetchCaregiver();
    }
  }, [id]);

  async function fetchCaregiver() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || '',
          is_licensed: data.is_licensed || false,
          license_number: data.license_number || '',
          license_expiry: data.license_expiry || '',
          capabilities: data.capabilities || ['companionship', 'errands'],
          availability: data.availability || DEFAULT_AVAILABILITY,
          status: data.status || 'pending',
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching caregiver:', error);
      Alert.alert('Error', 'Could not load caregiver details');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!form.full_name || !form.phone) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from('caregiver_profiles').insert({
          ...form,
          agency_id: user?.agency_id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('caregiver_profiles')
          .update(form)
          .eq('id', id);
        if (error) throw error;
      }

      router.back();
    } catch (error) {
      console.error('Error saving caregiver:', error);
      Alert.alert('Error', 'Could not save caregiver');
    }
    setSaving(false);
  }

  async function handleInvite() {
    try {
      const { error } = await supabase.functions.invoke('invite-caregiver', {
        body: {
          phone: form.phone,
          caregiver_name: form.full_name,
          agency_id: user?.agency_id,
        },
      });

      if (error) throw error;

      Alert.alert('Success', 'Invitation sent!');
      setForm({ ...form, status: 'pending' });
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Could not send invitation');
    }
  }

  async function handleDeactivate() {
    Alert.alert(
      'Deactivate Caregiver',
      'This will prevent this caregiver from accessing the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('caregiver_profiles')
                .update({ status: 'inactive' })
                .eq('id', id);
              if (error) throw error;
              setForm({ ...form, status: 'inactive' });
            } catch (error) {
              Alert.alert('Error', 'Could not deactivate caregiver');
            }
          },
        },
      ]
    );
  }

  function toggleCapability(capability: string) {
    if (form.capabilities.includes(capability)) {
      setForm({
        ...form,
        capabilities: form.capabilities.filter((c) => c !== capability),
      });
    } else {
      setForm({
        ...form,
        capabilities: [...form.capabilities, capability],
      });
    }
  }

  function toggleAvailabilitySlot(day: keyof WeeklyAvailability, slot: { start: string; end: string }) {
    const daySlots = form.availability[day];
    const exists = daySlots.some((s) => s.start === slot.start && s.end === slot.end);

    const newSlots = exists
      ? daySlots.filter((s) => s.start !== slot.start || s.end !== slot.end)
      : [...daySlots, slot];

    setForm({
      ...form,
      availability: { ...form.availability, [day]: newSlots },
    });
  }

  function isSlotSelected(day: keyof WeeklyAvailability, slot: typeof TIME_SLOTS[0]) {
    return form.availability[day].some((s) => s.start === slot.start && s.end === slot.end);
  }

  const allCapabilities = form.is_licensed
    ? [...DEFAULT_CAPABILITIES, 'medication_administration']
    : DEFAULT_CAPABILITIES;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Add Caregiver' : 'Edit Caregiver',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Basic Info */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Input
              label="Full Name"
              value={form.full_name}
              onChangeText={(text: string) => setForm({ ...form, full_name: text })}
              placeholder="Jane Smith"
            />

            <Input
              label="Phone Number"
              value={form.phone}
              onChangeText={(text: string) => setForm({ ...form, phone: text })}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
            />

            <Input
              label="Email (Optional)"
              value={form.email}
              onChangeText={(text: string) => setForm({ ...form, email: text })}
              placeholder="jane@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Card>

          {/* Licensing */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Licensing</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Licensed Caregiver</Text>
              <Switch
                value={form.is_licensed}
                onValueChange={(value) => setForm({ ...form, is_licensed: value })}
                trackColor={{ false: colors.neutral[200], true: colors.primary[500] }}
              />
            </View>

            {form.is_licensed && (
              <>
                <Input
                  label="License Number"
                  value={form.license_number}
                  onChangeText={(text: string) => setForm({ ...form, license_number: text })}
                  placeholder="LIC-123456"
                />
                <Input
                  label="License Expiry"
                  value={form.license_expiry}
                  onChangeText={(text: string) => setForm({ ...form, license_expiry: text })}
                  placeholder="MM/DD/YYYY"
                />
              </>
            )}
          </Card>

          {/* Capabilities */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <Text style={styles.sectionSubtitle}>
              Select the tasks this caregiver can perform
            </Text>

            <View style={styles.capabilitiesContainer}>
              {allCapabilities.map((capability) => {
                const isSelected = form.capabilities.includes(capability);
                const isRestricted = capability === 'medication_administration' && !form.is_licensed;

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
                    {isSelected && <CheckIcon size={16} color={colors.white} />}
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {CAPABILITY_LABELS[capability]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!form.is_licensed && (
              <Text style={styles.notice}>
                * Unlicensed caregivers cannot administer medications
              </Text>
            )}
          </Card>

          {/* Availability */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <Text style={styles.sectionSubtitle}>
              Select when this caregiver is available to work
            </Text>

            <View style={styles.availabilityContainer}>
              {/* Header */}
              <View style={styles.availabilityRow}>
                <View style={styles.dayLabel} />
                {TIME_SLOTS.map((slot) => (
                  <Text key={slot.label} style={styles.slotLabel}>
                    {slot.label}
                  </Text>
                ))}
              </View>

              {/* Days */}
              {DAYS.map((day) => (
                <View key={day} style={styles.availabilityRow}>
                  <Text style={styles.dayLabel}>
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Text>
                  {TIME_SLOTS.map((slot) => (
                    <Pressable
                      key={slot.label}
                      style={[
                        styles.slot,
                        isSlotSelected(day, slot) && styles.slotSelected,
                      ]}
                      onPress={() => toggleAvailabilitySlot(day, { start: slot.start, end: slot.end })}
                    >
                      {isSlotSelected(day, slot) && <View style={styles.selectedDot} />}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </Card>

          {/* Notes */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Input
              value={form.notes}
              onChangeText={(text: string) => setForm({ ...form, notes: text })}
              placeholder="Any additional notes about this caregiver..."
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={isNew ? 'Add Caregiver' : 'Save Changes'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />

            {!isNew && form.status !== 'active' && (
              <Button
                title="Send Invitation"
                variant="outline"
                onPress={handleInvite}
                fullWidth
              />
            )}

            {!isNew && form.status === 'active' && (
              <Button
                title="Deactivate Caregiver"
                variant="danger"
                onPress={handleDeactivate}
                fullWidth
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  sectionSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  switchLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    ...typography.styles.caption,
    color: colors.text.primary,
  },
  chipTextSelected: {
    color: colors.white,
  },
  notice: {
    ...typography.styles.caption,
    color: colors.warning[500],
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  availabilityContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[3],
  },
  availabilityRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'center',
  },
  dayLabel: {
    width: 40,
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  slotLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  slot: {
    flex: 1,
    height: 36,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotSelected: {
    backgroundColor: colors.primary[100],
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[500],
  },
  actions: {
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[8],
  },
});
