// HealthGuide Caregiver Marketplace Profile Editor
// Single-screen editor for existing caregiver profiles
// Fetches current profile and allows full editing

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Input, Card, Badge } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
import { RatingSummary } from '@/components/caregiver/RatingSummary';
import { ReviewsList } from '@/components/caregiver/ReviewsList';
import * as ImagePicker from 'expo-image-picker';

const CAREGIVER_COLOR = roleColors.caregiver; // Emerald #059669

const CAPABILITIES = [
  'companionship',
  'meal_preparation',
  'light_housekeeping',
  'errands',
  'mobility_assistance',
  'personal_care',
  'medication_reminders',
  'medication_administration',
];

const CAPABILITY_LABELS: Record<string, string> = {
  companionship: 'Companionship',
  meal_preparation: 'Meal Prep',
  light_housekeeping: 'Light Housekeeping',
  errands: 'Errands & Shopping',
  mobility_assistance: 'Mobility Assist',
  personal_care: 'Personal Care',
  medication_reminders: 'Med Reminders',
  medication_administration: 'Med Admin',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const TIME_SLOTS = [
  { label: 'Morning', value: 'morning', time: '6am–12pm' },
  { label: 'Afternoon', value: 'afternoon', time: '12pm–6pm' },
  { label: 'Evening', value: 'evening', time: '6pm–10pm' },
];

interface FormData {
  fullName: string;
  zipCode: string;
  photoUri: string | null;
  photoUrl: string | null;
  npiNumber: string;
  npiVerified: boolean;
  npiData: any;
  certifications: string;
  hourlyRate: string;
  capabilities: string[];
  availability: Record<string, string[]>;
  experienceSummary: string;
  bio: string;
  isActive: boolean;
}

export default function CaregiverMyProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const bioInputRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [positiveCount, setPositiveCount] = useState(0);
  const [showReviewsList, setShowReviewsList] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    zipCode: '',
    photoUri: null,
    photoUrl: null,
    npiNumber: '',
    npiVerified: false,
    npiData: null,
    certifications: '',
    hourlyRate: '',
    capabilities: [],
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
    experienceSummary: '',
    bio: '',
    isActive: true,
  });

  // Fetch existing profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('caregiver_profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfileId(data.id);
          setRatingCount(data.rating_count || 0);
          setPositiveCount(data.positive_count || 0);
          setFormData({
            fullName: data.full_name || '',
            zipCode: data.zip_code || '',
            photoUri: null,
            photoUrl: data.photo_url || null,
            npiNumber: data.npi_number || '',
            npiVerified: data.npi_verified || false,
            npiData: null,
            certifications: (data.certifications || []).join(', '),
            hourlyRate: data.hourly_rate ? String(data.hourly_rate) : '',
            capabilities: data.capabilities || [],
            availability: data.availability || {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: [],
            },
            experienceSummary: data.experience_summary || '',
            bio: data.bio || '',
            isActive: data.is_active ?? true,
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        Alert.alert('Error', 'Could not load your profile');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormData({ ...formData, photoUri: result.assets[0].uri });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const handleVerifyNPI = async () => {
    if (formData.npiNumber.length !== 10) {
      Alert.alert('Error', 'NPI must be exactly 10 digits');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-npi', {
        body: {
          npi_number: formData.npiNumber,
          user_id: user?.id,
        },
      });

      if (error) {
        Alert.alert('NPI Not Found', 'This NPI could not be verified');
        setFormData({ ...formData, npiVerified: false, npiData: null });
      } else {
        setFormData({
          ...formData,
          npiVerified: true,
          npiData: data,
        });
        Alert.alert('Success', 'NPI verified');
      }
    } catch (err) {
      Alert.alert('Verification Failed', 'Could not verify this NPI');
      console.error('NPI verification error:', err);
    }
    setSaving(false);
  };

  const toggleCapability = (capability: string) => {
    const updated = formData.capabilities.includes(capability)
      ? formData.capabilities.filter((c) => c !== capability)
      : [...formData.capabilities, capability];
    setFormData({ ...formData, capabilities: updated });
  };

  const toggleAvailabilitySlot = (day: string, slot: string) => {
    const daySlots = formData.availability[day] || [];
    const updated = daySlots.includes(slot)
      ? daySlots.filter((s) => s !== slot)
      : [...daySlots, slot];
    setFormData({
      ...formData,
      availability: { ...formData.availability, [day]: updated },
    });
  };

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim() || formData.zipCode.length !== 5) {
      Alert.alert('Error', 'Full Name and Zip Code are required');
      return;
    }

    setSaving(true);
    try {
      // Parse certifications array
      const certs = formData.certifications
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Upload new photo if selected
      let photoUrl = formData.photoUrl;
      if (formData.photoUri) {
        const photoName = `${user?.id}_${Date.now()}.jpg`;
        const response = await fetch(formData.photoUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`caregiver/${user?.id}/${photoName}`, blob);

        if (uploadError) throw uploadError;
        photoUrl = uploadData?.path || null;
      }

      // Update caregiver_profiles
      const { error: updateError } = await supabase
        .from('caregiver_profiles')
        .update({
          full_name: formData.fullName,
          zip_code: formData.zipCode,
          photo_url: photoUrl,
          npi_number: formData.npiNumber || null,
          npi_verified: formData.npiVerified,
          certifications: certs,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          capabilities: formData.capabilities,
          availability: formData.availability,
          experience_summary: formData.experienceSummary || null,
          bio: formData.bio || null,
          is_active: formData.isActive,
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Your profile has been updated', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', err.message || 'Could not update profile');
    }
    setSaving(false);
  };

  const handleToggleActive = () => {
    if (!formData.isActive) {
      // Re-activating
      setFormData({ ...formData, isActive: true });
    } else {
      // Deactivating
      Alert.alert(
        'Deactivate Profile',
        'This will hide your profile from agencies. You can reactivate anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: () => {
              setFormData({ ...formData, isActive: false });
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CAREGIVER_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header with Back Button */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Marketplace Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION 1: Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Photo */}
            <View style={styles.photoSection}>
              <Text style={styles.label}>Photo</Text>
              <Pressable onPress={handlePickImage} style={styles.photoButton}>
                {formData.photoUri || formData.photoUrl ? (
                  <Image
                    source={{
                      uri: formData.photoUri || `${supabase.storage.from('avatars').getPublicUrl(formData.photoUrl || '').data.publicUrl}`,
                    }}
                    style={styles.photoImage}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>
                      {formData.fullName ? formData.fullName.split(' ')[0][0] : 'A'}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handlePickImage}>
                <Text style={styles.photoChangeLink}>Change Photo</Text>
              </Pressable>
            </View>

            {/* Full Name */}
            <Input
              label="Full Name *"
              placeholder="Jane Smith"
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              autoCapitalize="words"
              size="caregiver"
            />

            {/* Zip Code */}
            <Input
              label="Zip Code *"
              placeholder="90210"
              value={formData.zipCode}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '').slice(0, 5);
                setFormData({ ...formData, zipCode: cleaned });
              }}
              keyboardType="numeric"
              maxLength={5}
              size="caregiver"
            />
          </View>

          {/* SECTION 2: Professional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Information</Text>

            {/* NPI Number */}
            <View>
              <Text style={styles.label}>NPI Number</Text>
              <View style={styles.npiRow}>
                <Input
                  placeholder="1234567890"
                  value={formData.npiNumber}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 10);
                    setFormData({
                      ...formData,
                      npiNumber: cleaned,
                      npiVerified: false,
                      npiData: null,
                    });
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                  size="caregiver"
                  style={{ flex: 1 }}
                />
                <Button
                  title={formData.npiVerified ? 'Re-verify' : 'Verify'}
                  variant="outline"
                  size="sm"
                  onPress={handleVerifyNPI}
                  loading={saving}
                  disabled={formData.npiNumber.length !== 10}
                  style={styles.verifyButton}
                />
              </View>

              {formData.npiVerified && formData.npiData && (
                <View style={styles.npiSuccess}>
                  <CheckIcon size={16} color={colors.success[600]} />
                  <View style={styles.npiSuccessText}>
                    <Text style={styles.npiVerifiedLabel}>Verified</Text>
                    <Text style={styles.npiVerifiedValue}>
                      {formData.npiData.credentials || 'Healthcare Provider'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Certifications */}
            <Input
              label="Certifications"
              placeholder="CNA, HHA, LPN, RN..."
              value={formData.certifications}
              onChangeText={(text) => setFormData({ ...formData, certifications: text })}
              autoCapitalize="characters"
              size="caregiver"
            />

            {/* Hourly Rate */}
            <Input
              label="Hourly Rate"
              placeholder="$20"
              value={formData.hourlyRate}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '');
                setFormData({ ...formData, hourlyRate: cleaned });
              }}
              keyboardType="decimal-pad"
              size="caregiver"
              leftIcon={<Text style={styles.currencyIcon}>$</Text>}
            />
          </View>

          {/* SECTION 3: Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <View style={styles.capabilitiesGrid}>
              {CAPABILITIES.map((cap) => {
                const isSelected = formData.capabilities.includes(cap);
                return (
                  <Pressable
                    key={cap}
                    style={[
                      styles.capabilityChip,
                      isSelected && {
                        backgroundColor: CAREGIVER_COLOR,
                        borderColor: CAREGIVER_COLOR,
                      },
                    ]}
                    onPress={() => toggleCapability(cap)}
                  >
                    {isSelected && <CheckIcon size={14} color={colors.white} />}
                    <Text
                      style={[
                        styles.capabilityChipText,
                        isSelected && styles.capabilityChipTextSelected,
                      ]}
                    >
                      {CAPABILITY_LABELS[cap]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* SECTION 4: Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.availabilityGrid}>
              {/* Header */}
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityCorner} />
                {TIME_SLOTS.map((slot) => (
                  <View key={slot.value} style={styles.availabilityHeaderCell}>
                    <Text style={styles.availabilityHeaderText}>{slot.label}</Text>
                    <Text style={styles.availabilityTimeText}>{slot.time}</Text>
                  </View>
                ))}
              </View>

              {/* Days */}
              {DAYS.map((day) => (
                <View key={day} style={styles.availabilityRow}>
                  <Text style={styles.availabilityDayLabel}>{DAY_LABELS[day]}</Text>
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = (formData.availability[day] || []).includes(slot.value);
                    return (
                      <Pressable
                        key={slot.value}
                        style={[
                          styles.availabilityCell,
                          isSelected && {
                            backgroundColor: CAREGIVER_COLOR,
                          },
                        ]}
                        onPress={() => toggleAvailabilitySlot(day, slot.value)}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.availabilityDot,
                              { backgroundColor: colors.white },
                            ]}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* SECTION 5: About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About You</Text>

            {/* Experience Summary */}
            <View>
              <Text style={styles.label}>Experience Summary</Text>
              <TextInput
                style={styles.multilineInput}
                placeholder="Describe your caregiving experience..."
                value={formData.experienceSummary}
                onChangeText={(text) =>
                  setFormData({ ...formData, experienceSummary: text })
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.text.disabled}
              />
            </View>

            {/* Bio */}
            <View>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                ref={bioInputRef}
                style={styles.multilineInput}
                placeholder="Tell agencies about yourself..."
                value={formData.bio}
                onChangeText={(text) => setFormData({ ...formData, bio: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor={colors.text.disabled}
              />
            </View>
          </View>

          {/* Your Ratings (Read-Only) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Ratings</Text>
            <View style={styles.ratingsCard}>
              <RatingSummary
                caregiverProfileId={profileId || undefined}
                ratingCount={ratingCount}
                positiveCount={positiveCount}
                mode="full"
                onViewReviews={() => setShowReviewsList(true)}
              />
            </View>
            <Text style={styles.ratingsNote}>
              Ratings are submitted by agency owners and other users. You cannot modify or delete them.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            {/* Save Button */}
            <Button
              title="Save Changes"
              variant="primary"
              size="caregiver"
              fullWidth
              loading={saving}
              onPress={handleSaveProfile}
              style={{ backgroundColor: CAREGIVER_COLOR }}
            />

            {/* Deactivate Toggle */}
            <Pressable
              onPress={handleToggleActive}
              style={[
                styles.deactivateButton,
                !formData.isActive && styles.deactivateButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.deactivateButtonText,
                  !formData.isActive && styles.deactivateButtonTextActive,
                ]}
              >
                {formData.isActive ? 'Deactivate Profile' : 'Reactivate Profile'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reviews List Modal */}
      {profileId && (
        <ReviewsList
          caregiverProfileId={profileId}
          caregiverName={formData.fullName}
          isVisible={showReviewsList}
          onClose={() => setShowReviewsList(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing[8],
  },
  sectionTitle: {
    ...typography.caregiver.heading,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 2,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  photoPlaceholderText: {
    ...typography.caregiver.heading,
    fontSize: 48,
    color: CAREGIVER_COLOR,
  },
  photoChangeLink: {
    ...typography.styles.body,
    color: CAREGIVER_COLOR,
    fontWeight: '600',
  },
  npiRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-end',
  },
  verifyButton: {
    marginBottom: 0,
  },
  npiSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.success[50],
    borderRadius: 8,
  },
  npiSuccessText: {
    flex: 1,
  },
  npiVerifiedLabel: {
    ...typography.styles.caption,
    color: colors.success[600],
    fontWeight: '600',
  },
  npiVerifiedValue: {
    ...typography.styles.bodySmall,
    color: colors.success[600],
  },
  currencyIcon: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  capabilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  capabilityChipText: {
    ...typography.styles.caption,
    color: colors.text.primary,
    fontWeight: '500',
  },
  capabilityChipTextSelected: {
    color: colors.white,
  },
  availabilityGrid: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[3],
  },
  availabilityRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'center',
  },
  availabilityCorner: {
    width: 50,
  },
  availabilityHeaderCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityHeaderText: {
    ...typography.styles.caption,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  availabilityTimeText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontSize: 9,
  },
  availabilityDayLabel: {
    width: 50,
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  availabilityCell: {
    flex: 1,
    height: 40,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  multilineInput: {
    ...typography.styles.body,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    minHeight: 100,
    fontFamily: 'System',
  },
  actionSection: {
    gap: spacing[3],
    marginTop: spacing[6],
  },
  deactivateButton: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    paddingVertical: spacing[3],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  deactivateButtonActive: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[300],
  },
  deactivateButtonText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  deactivateButtonTextActive: {
    color: colors.warning[700],
  },
  ratingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[2],
  },
  ratingsNote: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
});
