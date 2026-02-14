// HealthGuide Elder Detail/Edit Screen
// Per healthguide-agency/careseeker-mgmt skill

import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
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
import { CheckIcon, TrashIcon, AlertIcon, CaregiverIcon, FamilyIcon, ElderIcon } from '@/components/icons';
import { CareGroupCard } from '@/components/agency/CareGroupCard';
import { shareInvite, buildDeepLink } from '@/lib/invite';

interface ElderForm {
  full_name: string;
  preferred_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  care_needs: string[];
  special_instructions: string;
  emergency_contact: string;
  emergency_phone: string;
  caregiver_gender_preference: 'male' | 'female' | 'no_preference';
  status: 'active' | 'inactive' | 'pending_handshake';
  handshake_completed: boolean;
}

interface FamilyContact {
  id: string;
  full_name: string;
  relationship: string;
  phone: string;
  is_primary: boolean;
  notify_check_in: boolean;
  notify_check_out: boolean;
  notify_daily_report: boolean;
}

const DEFAULT_CARE_NEEDS = [
  'companionship',
  'meal_preparation',
  'light_housekeeping',
  'errands',
  'mobility_assistance',
  'personal_care',
  'medication_reminders',
];

const CARE_NEED_LABELS: Record<string, string> = {
  companionship: 'Companionship',
  meal_preparation: 'Meal Preparation',
  light_housekeeping: 'Light Housekeeping',
  errands: 'Errands & Shopping',
  mobility_assistance: 'Mobility Assistance',
  personal_care: 'Personal Care',
  medication_reminders: 'Medication Reminders',
};

const MAX_FAMILY_CONTACTS = 3;

export default function ElderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>([]);
  const [careGroup, setCareGroup] = useState<any>(null);
  const [careGroupMembers, setCareGroupMembers] = useState<any[]>([]);
  const [form, setForm] = useState<ElderForm>({
    full_name: '',
    preferred_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    care_needs: ['companionship'],
    special_instructions: '',
    emergency_contact: '',
    emergency_phone: '',
    caregiver_gender_preference: 'no_preference',
    status: 'pending_handshake',
    handshake_completed: false,
  });

  useEffect(() => {
    if (!isNew) {
      fetchElder();
      fetchFamilyContacts();
      fetchCareGroup();
    }
  }, [id]);

  async function fetchElder() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('elders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setForm({
          full_name: data.full_name || '',
          preferred_name: data.preferred_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          care_needs: data.care_needs || ['companionship'],
          special_instructions: data.special_instructions || '',
          emergency_contact: data.emergency_contact || '',
          emergency_phone: data.emergency_phone || '',
          caregiver_gender_preference: data.caregiver_gender_preference || 'no_preference',
          status: data.status || 'pending_handshake',
          handshake_completed: data.handshake_completed || false,
        });
      }
    } catch (error) {
      console.error('Error fetching elder:', error);
      Alert.alert('Error', 'Could not load elder details');
    }
    setLoading(false);
  }

  async function fetchFamilyContacts() {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('elder_id', id)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      if (data) {
        setFamilyContacts(data.map((c: any) => ({
          id: c.id,
          full_name: c.name || '',
          relationship: c.relationship || '',
          phone: c.phone || '',
          is_primary: c.is_primary || false,
          notify_check_in: c.notify_check_in !== false,
          notify_check_out: c.notify_check_out !== false,
          notify_daily_report: c.notify_daily_report !== false,
        })));
      }
    } catch (error) {
      console.error('Error fetching family contacts:', error);
    }
  }

  async function fetchCareGroup() {
    try {
      const { data: group, error } = await supabase
        .from('care_groups')
        .select(`
          id,
          name,
          invite_code,
          invite_expires_at,
          qr_code_data,
          is_active
        `)
        .eq('elder_id', id)
        .eq('is_active', true)
        .single();

      if (!error && group) {
        setCareGroup(group);

        const { data: members } = await supabase
          .from('care_group_members')
          .select('id, name, role, relationship, phone, invite_status')
          .eq('care_group_id', group.id)
          .eq('is_active', true)
          .order('role');

        setCareGroupMembers(members || []);
      }
    } catch (error) {
      // No care group yet — that's fine
    }
  }

  async function handleShareInvite() {
    if (!careGroup) return;
    await shareInvite({
      elderName: form.full_name || form.preferred_name || 'your loved one',
      inviteCode: careGroup.invite_code,
    });
  }

  async function handleSave() {
    if (!form.full_name || !form.address) {
      Alert.alert('Error', 'Name and address are required');
      return;
    }

    setSaving(true);
    try {
      // Geocode address for EVV
      let coords = null;
      try {
        const Location = await import('expo-location');
        const results = await Location.geocodeAsync(
          `${form.address}, ${form.city}, ${form.state} ${form.zip_code}`
        );
        coords = results[0];
      } catch (geoError) {
        console.warn('Geocoding failed:', geoError);
      }

      const dataToSave = {
        full_name: form.full_name,
        preferred_name: form.preferred_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        care_needs: form.care_needs,
        special_instructions: form.special_instructions,
        emergency_contact: form.emergency_contact,
        emergency_phone: form.emergency_phone,
        caregiver_gender_preference: form.caregiver_gender_preference,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('elders')
          .insert({
            ...dataToSave,
            agency_id: user?.agency_id,
            status: 'pending_handshake',
            handshake_completed: false,
          })
          .select()
          .single();

        if (error) throw error;

        // Navigate to family contacts
        router.replace(`/(protected)/agency/elder/${data.id}`);
      } else {
        const { error } = await supabase
          .from('elders')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;
        router.back();
      }
    } catch (error) {
      console.error('Error saving elder:', error);
      Alert.alert('Error', 'Could not save elder');
    }
    setSaving(false);
  }

  async function handleHandshake(withWhom: 'careseeker' | 'family_member') {
    try {
      const { error } = await supabase
        .from('elders')
        .update({
          handshake_completed: true,
          handshake_date: new Date().toISOString(),
          handshake_with: withWhom,
          status: 'active',
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Handshake completed! Care can now begin.');
      setForm({ ...form, handshake_completed: true, status: 'active' });
    } catch (error) {
      Alert.alert('Error', 'Could not complete handshake');
    }
  }

  function promptHandshake() {
    Alert.alert(
      'Complete Handshake',
      'Who is confirming the care agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Elder (Careseeker)', onPress: () => handleHandshake('careseeker') },
        { text: 'Family Member', onPress: () => handleHandshake('family_member') },
      ]
    );
  }

  function toggleCareNeed(need: string) {
    if (form.care_needs.includes(need)) {
      setForm({
        ...form,
        care_needs: form.care_needs.filter((n) => n !== need),
      });
    } else {
      setForm({
        ...form,
        care_needs: [...form.care_needs, need],
      });
    }
  }

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
          title: isNew ? 'Add Elder' : 'Edit Elder',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Handshake Banner */}
          {!isNew && !form.handshake_completed && (
            <Card style={styles.handshakeBanner}>
              <View style={styles.handshakeContent}>
                <AlertIcon size={24} color={colors.warning[500]} />
                <View style={styles.handshakeText}>
                  <Text style={styles.handshakeTitle}>Handshake Required</Text>
                  <Text style={styles.handshakeSubtitle}>
                    Complete handshake before care can begin
                  </Text>
                </View>
              </View>
              <Button
                title="Complete Handshake"
                variant="primary"
                size="sm"
                onPress={promptHandshake}
              />
            </Card>
          )}

          {/* Personal Information */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <Input
              label="Full Name"
              value={form.full_name}
              onChangeText={(text: string) => setForm({ ...form, full_name: text })}
              placeholder="John Smith"
            />

            <Input
              label="Preferred Name"
              value={form.preferred_name}
              onChangeText={(text: string) => setForm({ ...form, preferred_name: text })}
              placeholder="Johnny"
            />

            <Input
              label="Phone"
              value={form.phone}
              onChangeText={(text: string) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />

            <Input
              label="Email"
              value={form.email}
              onChangeText={(text: string) => setForm({ ...form, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Card>

          {/* Address */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Address (Required for EVV)</Text>

            <Input
              label="Street Address"
              value={form.address}
              onChangeText={(text: string) => setForm({ ...form, address: text })}
              placeholder="123 Main St"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label="City"
                  value={form.city}
                  onChangeText={(text: string) => setForm({ ...form, city: text })}
                />
              </View>
              <View style={styles.stateInput}>
                <Input
                  label="State"
                  value={form.state}
                  onChangeText={(text: string) => setForm({ ...form, state: text })}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.zipInput}>
                <Input
                  label="ZIP"
                  value={form.zip_code}
                  onChangeText={(text: string) => setForm({ ...form, zip_code: text })}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>
          </Card>

          {/* Care Needs */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Care Needs</Text>
            <Text style={styles.sectionSubtitle}>
              Select the tasks this elder needs help with
            </Text>

            <View style={styles.careNeedsContainer}>
              {DEFAULT_CARE_NEEDS.map((need) => {
                const isSelected = form.care_needs.includes(need);

                return (
                  <Pressable
                    key={need}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleCareNeed(need)}
                  >
                    {isSelected && <CheckIcon size={16} color={colors.white} />}
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {CARE_NEED_LABELS[need]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Special Instructions */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>

            <Input
              value={form.special_instructions}
              onChangeText={(text: string) => setForm({ ...form, special_instructions: text })}
              placeholder="Any special care instructions..."
              multiline
              numberOfLines={4}
            />
          </Card>

          {/* Emergency Contact */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            <Input
              label="Contact Name"
              value={form.emergency_contact}
              onChangeText={(text: string) => setForm({ ...form, emergency_contact: text })}
              placeholder="Jane Smith"
            />

            <Input
              label="Contact Phone"
              value={form.emergency_phone}
              onChangeText={(text: string) => setForm({ ...form, emergency_phone: text })}
              keyboardType="phone-pad"
            />
          </Card>

          {/* Video Contacts */}
          {!isNew && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Video Contacts</Text>
              <Text style={styles.sectionSubtitle}>
                Manage video call links for family members
              </Text>
              <Button
                title="Manage Video Contacts"
                variant="secondary"
                onPress={() =>
                  router.push(
                    `/(protected)/agency/elder/video-contacts?elder_id=${id}&elder_name=${encodeURIComponent(form.full_name || form.preferred_name || '')}`
                  )
                }
                fullWidth
              />
            </Card>
          )}

          {/* Care Team */}
          {!isNew && (
            <>
              {careGroup ? (
                <CareGroupCard
                  groupName={careGroup.name}
                  members={careGroupMembers}
                  inviteCode={careGroup.invite_code}
                  onShareInvite={handleShareInvite}
                  onManageGroup={() =>
                    router.push(`/(protected)/agency/elder/care-group-detail?group_id=${careGroup.id}`)
                  }
                />
              ) : (
                <Card style={styles.section}>
                  <Text style={styles.sectionTitle}>Care Team</Text>
                  <Text style={styles.emptyText}>
                    No care group created yet. Create one to invite caregivers, family members, and the elder.
                  </Text>
                  <Button
                    title="Create Care Group"
                    onPress={() =>
                      router.push(`/(protected)/agency/elder/care-group?elder_id=${id}`)
                    }
                    fullWidth
                  />
                </Card>
              )}
            </>
          )}

          {/* Legacy Family Contacts (read-only, for backward compatibility) */}
          {!isNew && familyContacts.length > 0 && !careGroup && (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Family Contacts (Legacy)</Text>
                <Text style={styles.contactCount}>
                  {familyContacts.length} / {MAX_FAMILY_CONTACTS}
                </Text>
              </View>

              {familyContacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>
                      {contact.full_name}
                      {contact.is_primary && (
                        <Text style={styles.primaryBadge}> (Primary)</Text>
                      )}
                    </Text>
                    <Text style={styles.contactRelation}>{contact.relationship}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </View>
              ))}

              <Text style={styles.notifyNote}>
                These contacts were added before Care Groups. Create a Care Group to manage all members in one place.
              </Text>
            </Card>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={isNew ? 'Save Elder' : 'Save Changes'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
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
  handshakeBanner: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
    borderWidth: 1,
    padding: spacing[4],
  },
  handshakeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  handshakeText: {
    flex: 1,
  },
  handshakeTitle: {
    ...typography.styles.label,
    color: colors.warning[700],
  },
  handshakeSubtitle: {
    ...typography.styles.caption,
    color: colors.warning[600],
  },
  section: {
    padding: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
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
  row: {
    flexDirection: 'row',
    gap: spacing[3],
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
  careNeedsContainer: {
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
  chipText: {
    ...typography.styles.caption,
    color: colors.text.primary,
  },
  chipTextSelected: {
    color: colors.white,
  },
  contactCount: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  primaryBadge: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  contactRelation: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  contactPhone: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  notifyNote: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing[3],
  },
  actions: {
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[8],
  },
});
