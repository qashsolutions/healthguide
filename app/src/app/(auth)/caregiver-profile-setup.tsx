// HealthGuide Caregiver Profile Setup Screen
// Multi-step profile creation after phone verification
// Per healthguide-core/auth skill - Large touch targets
// Per frontend-design skill - Role-based theming with emerald

import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Input, Card } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
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
  npiNumber: string;
  npiVerified: boolean;
  npiData: any;
  certifications: string;
  hourlyRate: string;
  capabilities: string[];
  availability: Record<string, string[]>;
  experienceSummary: string;
  bio: string;
}

export default function CaregiverProfileSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const bioInputRef = useRef<TextInput>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    zipCode: '',
    photoUri: null,
    npiNumber: '',
    npiVerified: false,
    npiData: null,
    certifications: '',
    hourlyRate: '',
    capabilities: [],
    availability: {
      monday: ['morning', 'afternoon'],
      tuesday: ['morning', 'afternoon'],
      wednesday: ['morning', 'afternoon'],
      thursday: ['morning', 'afternoon'],
      friday: ['morning', 'afternoon'],
      saturday: [],
      sunday: [],
    },
    experienceSummary: '',
    bio: '',
  });

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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-npi', {
        body: {
          npi_number: formData.npiNumber,
          user_id: user?.id,
        },
      });

      if (error) {
        // NPI not found - allow continuation
        Alert.alert('NPI Not Found', 'You can continue without verification');
        setFormData({ ...formData, npiVerified: false, npiData: null });
      } else {
        // NPI verified
        setFormData({
          ...formData,
          npiVerified: true,
          npiData: data,
        });
      }
    } catch (err) {
      Alert.alert('Verification Failed', 'You can continue without verification');
      console.error('NPI verification error:', err);
    }
    setLoading(false);
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

  const isStep1Valid = formData.fullName.trim().length > 0 && formData.zipCode.length === 5;
  const isStep2Valid = true; // All optional
  const isStep3Valid = true; // All optional
  const isStep4Valid = true; // All optional

  const stepValidation = [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid];

  const handleNext = () => {
    if (!stepValidation[step - 1]) return;
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleCompleteProfile = async () => {
    if (!isStep1Valid) return;

    setLoading(true);
    try {
      // Build availability JSONB
      const availability = formData.availability;

      // Parse certifications array
      const certs = formData.certifications
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Upload photo if selected
      let photoUrl = null;
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

      // Insert into caregiver_profiles
      const { error: insertError } = await supabase
        .from('caregiver_profiles')
        .insert({
          user_id: user?.id,
          full_name: formData.fullName,
          zip_code: formData.zipCode,
          photo_url: photoUrl,
          npi_number: formData.npiNumber || null,
          npi_verified: formData.npiVerified,
          certifications: certs,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          capabilities: formData.capabilities,
          availability: availability,
          experience_summary: formData.experienceSummary || null,
          bio: formData.bio || null,
        });

      if (insertError) throw insertError;

      // Update auth user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: 'caregiver',
          has_profile: true,
        },
      });

      if (updateError) throw updateError;

      Alert.alert('Success', 'Profile created! Agencies can now find you.', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(protected)/caregiver/(tabs)');
          },
        },
      ]);
    } catch (err: any) {
      console.error('Error creating profile:', err);
      Alert.alert('Error', err.message || 'Could not create profile');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Back Button */}
        {step > 1 && (
          <Button
            title=""
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon size={24} />}
            onPress={handleBack}
            style={styles.backButton}
          />
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: s <= step ? CAREGIVER_COLOR : colors.neutral[200],
                  },
                ]}
              />
            ))}
          </View>

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Basic Information</Text>

              <View style={styles.form}>
                <Input
                  label="Full Name *"
                  placeholder="Jane Smith"
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                  autoCapitalize="words"
                  size="caregiver"
                />

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

                {/* Photo Picker */}
                <View>
                  <Text style={styles.label}>Photo (Optional)</Text>
                  <Pressable
                    onPress={handlePickImage}
                    style={styles.photoButton}
                  >
                    {formData.photoUri ? (
                      <Image
                        source={{ uri: formData.photoUri }}
                        style={styles.photoImage}
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: Professional Info */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Professional Information</Text>

              <View style={styles.form}>
                <View>
                  <Text style={styles.label}>NPI Number (Optional)</Text>
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
                      title="Verify"
                      variant="outline"
                      size="sm"
                      onPress={handleVerifyNPI}
                      loading={loading}
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

                <Input
                  label="Certifications (Optional)"
                  placeholder="CNA, HHA, LPN, RN..."
                  value={formData.certifications}
                  onChangeText={(text) => setFormData({ ...formData, certifications: text })}
                  autoCapitalize="characters"
                  size="caregiver"
                />

                <Input
                  label="Hourly Rate (Optional)"
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
            </View>
          )}

          {/* STEP 3: Skills & Availability */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Skills & Availability</Text>

              {/* Capabilities */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Capabilities</Text>
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

              {/* Availability Grid */}
              <View style={[styles.sectionBlock, { marginTop: spacing[6] }]}>
                <Text style={styles.sectionLabel}>Availability</Text>
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
                        const isSelected = (formData.availability[day] || []).includes(
                          slot.value
                        );
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
                                style={[styles.availabilityDot, { backgroundColor: colors.white }]}
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: About Me */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>About You</Text>

              <View style={styles.form}>
                <View>
                  <Text style={styles.label}>Experience Summary (Optional)</Text>
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

                <View>
                  <Text style={styles.label}>Bio (Optional)</Text>
                  <TextInput
                    ref={bioInputRef}
                    style={styles.multilineInput}
                    placeholder="Tell agencies about yourself..."
                    value={formData.bio}
                    onChangeText={(text) =>
                      setFormData({ ...formData, bio: text })
                    }
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholderTextColor={colors.text.disabled}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {step < 4 && (
              <>
                <Button
                  title="Next"
                  variant="primary"
                  size="caregiver"
                  fullWidth
                  disabled={!stepValidation[step - 1]}
                  onPress={handleNext}
                  style={{ backgroundColor: CAREGIVER_COLOR }}
                />

                {step > 1 && (
                  <Pressable
                    onPress={handleSkip}
                    style={styles.skipButton}
                  >
                    <Text style={styles.skipText}>Skip</Text>
                  </Pressable>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <Button
                  title="Complete Profile"
                  variant="primary"
                  size="caregiver"
                  fullWidth
                  loading={loading}
                  onPress={handleCompleteProfile}
                  style={{ backgroundColor: CAREGIVER_COLOR }}
                />

                <Pressable
                  onPress={handleSkip}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing[4],
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepContainer: {
    marginBottom: spacing[8],
  },
  stepTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[6],
  },
  form: {
    gap: spacing[4],
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
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
    ...typography.styles.body,
    color: colors.text.secondary,
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
  sectionBlock: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[3],
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
  buttonContainer: {
    gap: spacing[3],
    marginTop: spacing[6],
  },
  skipButton: {
    paddingVertical: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    ...typography.styles.body,
    color: CAREGIVER_COLOR,
    fontWeight: '600',
  },
});
