// HealthGuide Caregiver Marketplace Profile Editor
// Single-screen editor for existing caregiver profiles
// Mirrors setup screen: tag inputs, 2hr availability, keywords, no NPI

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
import { Button, Input } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, CheckIcon, CloseIcon } from '@/components/icons';
import { RatingSummary } from '@/components/caregiver/RatingSummary';
import { ReviewsList } from '@/components/caregiver/ReviewsList';
import * as ImagePicker from 'expo-image-picker';

const CAREGIVER_COLOR = roleColors.caregiver;

const SUGGESTED_TASKS = [
  'Companionship', 'Meal Preparation', 'Light Housekeeping', 'Errands & Shopping',
  'Transportation', 'Pet Care', 'Lawn & Yard Care', 'Grocery Shopping & Errands', 'Tutoring',
];

const SUGGESTED_KEYWORDS = [
  'Experienced', 'Compassionate', 'Reliable', 'Patient', 'Dementia Care',
  'Alzheimer\'s', 'Post-Surgery', 'Hospice Care', 'Physical Therapy',
  'Spanish Speaking', 'Bilingual', 'CPR Certified', 'First Aid',
  'Live-In Available', 'Night Shifts', 'Weekend Available',
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const TIME_SLOTS = [
  { label: '6-8a', value: '6am-8am' },
  { label: '8-10a', value: '8am-10am' },
  { label: '10-12p', value: '10am-12pm' },
  { label: '12-2p', value: '12pm-2pm' },
  { label: '2-4p', value: '2pm-4pm' },
  { label: '4-6p', value: '4pm-6pm' },
  { label: '6-8p', value: '6pm-8pm' },
  { label: '8-10p', value: '8pm-10pm' },
];

const MAX_SLOTS_PER_DAY = 4;

const SCHEDULE_PRESETS = [
  {
    label: 'Full-Time',
    desc: 'Mon–Fri, 8am–4pm',
    build: () => {
      const wd = ['8am-10am', '10am-12pm', '12pm-2pm', '2pm-4pm'];
      return { monday: wd, tuesday: wd, wednesday: wd, thursday: wd, friday: wd, saturday: [] as string[], sunday: [] as string[] };
    },
  },
  {
    label: 'Mornings',
    desc: 'Mon–Fri, 6am–12pm',
    build: () => {
      const m = ['6am-8am', '8am-10am', '10am-12pm'];
      return { monday: m, tuesday: m, wednesday: m, thursday: m, friday: m, saturday: [] as string[], sunday: [] as string[] };
    },
  },
  {
    label: 'Evenings',
    desc: 'Mon–Fri, 4pm–10pm',
    build: () => {
      const e = ['4pm-6pm', '6pm-8pm', '8pm-10pm'];
      return { monday: e, tuesday: e, wednesday: e, thursday: e, friday: e, saturday: [] as string[], sunday: [] as string[] };
    },
  },
  {
    label: 'Weekends',
    desc: 'Sat–Sun, 8am–4pm',
    build: () => {
      const d = ['8am-10am', '10am-12pm', '12pm-2pm', '2pm-4pm'];
      return { monday: [] as string[], tuesday: [] as string[], wednesday: [] as string[], thursday: [] as string[], friday: [] as string[], saturday: d, sunday: d };
    },
  },
];

interface FormData {
  fullName: string;
  zipCode: string;
  photoUri: string | null;
  photoUrl: string | null;
  certifications: string;
  hourlyRateMin: string;
  hourlyRateMax: string;
  capabilities: string[];
  keywords: string[];
  availability: Record<string, string[]>;
  experienceSummary: string;
  bio: string;
  isActive: boolean;
}

export default function CaregiverMyProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [positiveCount, setPositiveCount] = useState(0);
  const [showReviewsList, setShowReviewsList] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const taskInputRef = useRef<TextInput>(null);
  const keywordInputRef = useRef<TextInput>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    zipCode: '',
    photoUri: null,
    photoUrl: null,
    certifications: '',
    hourlyRateMin: '',
    hourlyRateMax: '',
    capabilities: [],
    keywords: [],
    availability: {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    },
    experienceSummary: '',
    bio: '',
    isActive: true,
  });

  useEffect(() => {
    if (user?.id) fetchProfile();
  }, [user?.id]);

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
          certifications: (data.certifications || []).join(', '),
          hourlyRateMin: data.hourly_rate_min ? String(data.hourly_rate_min) : '',
          hourlyRateMax: data.hourly_rate_max ? String(data.hourly_rate_max) : '',
          capabilities: data.capabilities || [],
          keywords: data.keywords || [],
          availability: data.availability || {
            monday: [], tuesday: [], wednesday: [], thursday: [],
            friday: [], saturday: [], sunday: [],
          },
          experienceSummary: data.experience_summary || '',
          bio: data.bio || '',
          isActive: data.is_active ?? true,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load your profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setFormData({ ...formData, photoUri: result.assets[0].uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  // Tag input helpers
  const addTask = (task: string) => {
    const trimmed = task.trim();
    if (trimmed && !formData.capabilities.includes(trimmed)) {
      setFormData({ ...formData, capabilities: [...formData.capabilities, trimmed] });
    }
    setTaskInput('');
  };

  const removeTask = (task: string) => {
    setFormData({ ...formData, capabilities: formData.capabilities.filter(t => t !== task) });
  };

  const handleTaskInputChange = (text: string) => {
    if (text.endsWith(',') || text.endsWith('\n')) {
      addTask(text.slice(0, -1));
    } else {
      setTaskInput(text);
    }
  };

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && !formData.keywords.includes(trimmed)) {
      setFormData({ ...formData, keywords: [...formData.keywords, trimmed] });
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== kw) });
  };

  const handleKeywordInputChange = (text: string) => {
    if (text.endsWith(',') || text.endsWith('\n')) {
      addKeyword(text.slice(0, -1));
    } else {
      setKeywordInput(text);
    }
  };

  // Availability helpers
  const toggleAvailabilitySlot = (day: string, slot: string) => {
    const daySlots = formData.availability[day] || [];
    if (daySlots.includes(slot)) {
      setFormData({
        ...formData,
        availability: { ...formData.availability, [day]: daySlots.filter(s => s !== slot) },
      });
      setActivePreset(null);
    } else if (daySlots.length < MAX_SLOTS_PER_DAY) {
      setFormData({
        ...formData,
        availability: { ...formData.availability, [day]: [...daySlots, slot] },
      });
      setActivePreset(null);
    }
  };

  const applyPreset = (preset: typeof SCHEDULE_PRESETS[0]) => {
    setActivePreset(preset.label);
    setFormData({ ...formData, availability: preset.build() });
  };

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim() || formData.zipCode.length !== 5) {
      Alert.alert('Error', 'Full Name and Zip Code are required');
      return;
    }
    setSaving(true);
    try {
      const certs = formData.certifications
        .split(',').map(c => c.trim()).filter(c => c.length > 0);

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

      const { error: updateError } = await supabase
        .from('caregiver_profiles')
        .update({
          full_name: formData.fullName,
          zip_code: formData.zipCode,
          photo_url: photoUrl,
          certifications: certs,
          hourly_rate_min: formData.hourlyRateMin ? parseFloat(formData.hourlyRateMin) : null,
          hourly_rate_max: formData.hourlyRateMax ? parseFloat(formData.hourlyRateMax) : null,
          capabilities: formData.capabilities,
          keywords: formData.keywords,
          availability: formData.availability,
          experience_summary: formData.experienceSummary || null,
          bio: formData.bio || null,
          is_active: formData.isActive,
        })
        .eq('user_id', user?.id);
      if (updateError) throw updateError;

      Alert.alert('Success', 'Your profile has been updated', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile');
    }
    setSaving(false);
  };

  const handleToggleActive = () => {
    if (!formData.isActive) {
      setFormData({ ...formData, isActive: true });
    } else {
      Alert.alert(
        'Deactivate Profile',
        'This will hide your profile from agencies. You can reactivate anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Deactivate', style: 'destructive', onPress: () => setFormData({ ...formData, isActive: false }) },
        ]
      );
    }
  };

  // Reusable components
  const TagChips = ({ tags, onRemove, color }: { tags: string[]; onRemove: (t: string) => void; color: string }) => (
    <View style={st.tagChipsRow}>
      {tags.map(tag => (
        <View key={tag} style={[st.tagChip, { backgroundColor: color + '15', borderColor: color }]}>
          <Text style={[st.tagChipText, { color }]}>{tag}</Text>
          <Pressable onPress={() => onRemove(tag)} hitSlop={8}>
            <CloseIcon size={14} color={color} />
          </Pressable>
        </View>
      ))}
    </View>
  );

  const SuggestionChips = ({ suggestions, selected, onToggle }: {
    suggestions: string[]; selected: string[]; onToggle: (s: string) => void;
  }) => (
    <View style={st.suggestionsRow}>
      {suggestions.filter(s => !selected.includes(s)).slice(0, 6).map(item => (
        <Pressable key={item} style={st.suggestionChip} onPress={() => onToggle(item)}>
          <Text style={st.suggestionChipText}>+ {item}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={CAREGIVER_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={st.keyboardView}
      >
        {/* Header */}
        <View style={st.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={st.headerTitle}>Edit Marketplace Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={st.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Basic Information</Text>

            <View style={st.photoSection}>
              <Pressable onPress={handlePickImage} style={st.photoButton}>
                {formData.photoUri || formData.photoUrl ? (
                  <Image
                    source={{
                      uri: formData.photoUri || `${supabase.storage.from('avatars').getPublicUrl(formData.photoUrl || '').data.publicUrl}`,
                    }}
                    style={st.photoImage}
                  />
                ) : (
                  <View style={st.photoPlaceholder}>
                    <Text style={st.photoPlaceholderText}>
                      {formData.fullName ? formData.fullName.split(' ')[0][0] : 'A'}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handlePickImage}>
                <Text style={st.photoChangeLink}>Change Photo</Text>
              </Pressable>
            </View>

            <Input
              label="Full Name *"
              placeholder="Jane Smith"
              value={formData.fullName}
              onChangeText={text => setFormData({ ...formData, fullName: text })}
              autoCapitalize="words"
              size="caregiver"
            />

            <Input
              label="Zip Code *"
              placeholder="90210"
              value={formData.zipCode}
              onChangeText={text => {
                const cleaned = text.replace(/\D/g, '').slice(0, 5);
                setFormData({ ...formData, zipCode: cleaned });
              }}
              keyboardType="numeric"
              maxLength={5}
              size="caregiver"
            />
          </View>

          {/* Professional Info */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Professional Information</Text>

            <Input
              label="Certifications"
              placeholder="CNA, HHA, LPN, RN..."
              value={formData.certifications}
              onChangeText={text => setFormData({ ...formData, certifications: text })}
              autoCapitalize="characters"
              size="caregiver"
            />

            <View>
              <Text style={st.label}>Hourly Rate Range</Text>
              <View style={st.rateRangeRow}>
                <View style={st.rateInputWrapper}>
                  <Input
                    placeholder="15"
                    value={formData.hourlyRateMin}
                    onChangeText={text => {
                      const cleaned = text.replace(/[^\d.]/g, '');
                      setFormData({ ...formData, hourlyRateMin: cleaned });
                    }}
                    keyboardType="decimal-pad"
                    size="caregiver"
                    leftIcon={<Text style={st.currencyIcon}>$</Text>}
                  />
                </View>
                <Text style={st.rateDash}>—</Text>
                <View style={st.rateInputWrapper}>
                  <Input
                    placeholder="25"
                    value={formData.hourlyRateMax}
                    onChangeText={text => {
                      const cleaned = text.replace(/[^\d.]/g, '');
                      setFormData({ ...formData, hourlyRateMax: cleaned });
                    }}
                    keyboardType="decimal-pad"
                    size="caregiver"
                    leftIcon={<Text style={st.currencyIcon}>$</Text>}
                  />
                </View>
                <Text style={st.rateUnit}>/hr</Text>
              </View>
            </View>
          </View>

          {/* Tasks / Capabilities */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Tasks You Can Perform</Text>
            {formData.capabilities.length > 0 && (
              <TagChips tags={formData.capabilities} onRemove={removeTask} color={CAREGIVER_COLOR} />
            )}
            <TextInput
              ref={taskInputRef}
              style={st.tagInput}
              placeholder="Type a task and press comma to add..."
              placeholderTextColor={colors.text.disabled}
              value={taskInput}
              onChangeText={handleTaskInputChange}
              onSubmitEditing={() => { if (taskInput.trim()) addTask(taskInput); }}
              returnKeyType="done"
            />
            <Text style={st.inputHint}>Tap suggestions or type your own</Text>
            <SuggestionChips suggestions={SUGGESTED_TASKS} selected={formData.capabilities} onToggle={addTask} />
          </View>

          {/* Keywords */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Keywords</Text>
            <Text style={st.inputHint}>Help agencies find you by adding searchable keywords</Text>
            {formData.keywords.length > 0 && (
              <TagChips tags={formData.keywords} onRemove={removeKeyword} color={colors.info[600]} />
            )}
            <TextInput
              ref={keywordInputRef}
              style={st.tagInput}
              placeholder="Type a keyword and press comma..."
              placeholderTextColor={colors.text.disabled}
              value={keywordInput}
              onChangeText={handleKeywordInputChange}
              onSubmitEditing={() => { if (keywordInput.trim()) addKeyword(keywordInput); }}
              returnKeyType="done"
            />
            <SuggestionChips suggestions={SUGGESTED_KEYWORDS} selected={formData.keywords} onToggle={addKeyword} />
          </View>

          {/* Availability */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Availability</Text>
            <Text style={st.inputHint}>Max 8 hrs/day (4 slots)</Text>

            {/* Presets */}
            <View style={st.presetsRow}>
              {SCHEDULE_PRESETS.map(preset => (
                <Pressable
                  key={preset.label}
                  style={[st.presetChip, activePreset === preset.label && st.presetChipActive]}
                  onPress={() => applyPreset(preset)}
                >
                  <Text style={[st.presetLabel, activePreset === preset.label && st.presetLabelActive]}>{preset.label}</Text>
                  <Text style={[st.presetDesc, activePreset === preset.label && st.presetDescActive]}>{preset.desc}</Text>
                </Pressable>
              ))}
            </View>

            {/* Grid */}
            <View style={st.availGrid}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={st.availRow}>
                    <View style={st.availDayCell} />
                    {TIME_SLOTS.map(slot => (
                      <View key={slot.value} style={st.availHeaderCell}>
                        <Text style={st.availHeaderText}>{slot.label}</Text>
                      </View>
                    ))}
                    <View style={st.availHoursCell}>
                      <Text style={st.availHoursHeader}>Hrs</Text>
                    </View>
                  </View>
                  {DAYS.map(day => {
                    const daySlots = formData.availability[day] || [];
                    const hours = daySlots.length * 2;
                    const atMax = daySlots.length >= MAX_SLOTS_PER_DAY;
                    return (
                      <View key={day} style={st.availRow}>
                        <View style={st.availDayCell}>
                          <Text style={st.availDayText}>{DAY_LABELS[day]}</Text>
                        </View>
                        {TIME_SLOTS.map(slot => {
                          const isSelected = daySlots.includes(slot.value);
                          const isDisabled = !isSelected && atMax;
                          return (
                            <Pressable
                              key={slot.value}
                              style={[
                                st.availCell,
                                isSelected && st.availCellSelected,
                                isDisabled && st.availCellDisabled,
                              ]}
                              onPress={() => !isDisabled && toggleAvailabilitySlot(day, slot.value)}
                            >
                              {isSelected && <CheckIcon size={12} color={colors.white} />}
                            </Pressable>
                          );
                        })}
                        <View style={st.availHoursCell}>
                          <Text style={[
                            st.availHoursText,
                            hours > 0 && { color: CAREGIVER_COLOR, fontWeight: '700' as const },
                          ]}>{hours}h</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* About */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>About You</Text>

            <View>
              <Text style={st.label}>Experience Summary</Text>
              <TextInput
                style={st.multilineInput}
                placeholder="Describe your caregiving experience..."
                value={formData.experienceSummary}
                onChangeText={text => setFormData({ ...formData, experienceSummary: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.text.disabled}
              />
            </View>

            <View style={{ marginTop: spacing[4] }}>
              <Text style={st.label}>Bio</Text>
              <TextInput
                style={st.bioInput}
                placeholder="Tell agencies about yourself..."
                value={formData.bio}
                onChangeText={text => setFormData({ ...formData, bio: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholderTextColor={colors.text.disabled}
              />
              <Text style={st.bioGuide}>
                Share what makes you unique — your personality, approach to care, and why you love caregiving
              </Text>
            </View>
          </View>

          {/* Ratings */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Your Ratings</Text>
            <View style={st.ratingsCard}>
              <RatingSummary
                caregiverProfileId={profileId || undefined}
                ratingCount={ratingCount}
                positiveCount={positiveCount}
                mode="full"
                onViewReviews={() => setShowReviewsList(true)}
              />
            </View>
            <Text style={st.ratingsNote}>
              Ratings are submitted by agency owners and other users. You cannot modify or delete them.
            </Text>
          </View>

          {/* Actions */}
          <View style={st.actionSection}>
            <Button
              title="Save Changes"
              variant="primary"
              size="caregiver"
              fullWidth
              loading={saving}
              onPress={handleSaveProfile}
              style={{ backgroundColor: CAREGIVER_COLOR }}
            />

            <Pressable
              onPress={handleToggleActive}
              style={[st.deactivateButton, !formData.isActive && st.deactivateButtonActive]}
            >
              <Text style={[st.deactivateButtonText, !formData.isActive && st.deactivateButtonTextActive]}>
                {formData.isActive ? 'Deactivate Profile' : 'Reactivate Profile'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  section: { marginBottom: spacing[8] },
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
    fontWeight: '600',
  },
  inputHint: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },

  // Photo
  photoSection: { alignItems: 'center', marginBottom: spacing[6] },
  photoButton: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 2, borderColor: colors.neutral[200],
    overflow: 'hidden', marginBottom: spacing[2],
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', flex: 1 },
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

  currencyIcon: { ...typography.styles.body, color: colors.text.secondary },
  rateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rateInputWrapper: { flex: 1 },
  rateDash: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  rateUnit: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Tag input
  tagInput: {
    ...typography.styles.body,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 10,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5] || 10,
    minHeight: 44,
  },

  // Tag chips
  tagChipsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing[2], marginBottom: spacing[2],
  },
  tagChip: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5] || 6,
    borderRadius: 16, borderWidth: 1,
  },
  tagChipText: { ...typography.styles.caption, fontWeight: '600' },

  // Suggestion chips
  suggestionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing[1.5] || 6,
  },
  suggestionChip: {
    paddingHorizontal: spacing[2.5] || 10,
    paddingVertical: spacing[1],
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    borderWidth: 1, borderColor: colors.neutral[200],
  },
  suggestionChipText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },

  // Schedule presets
  presetsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing[2], marginBottom: spacing[4],
  },
  presetChip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.neutral[200],
    minWidth: 100,
  },
  presetChipActive: {
    backgroundColor: CAREGIVER_COLOR + '12',
    borderColor: CAREGIVER_COLOR,
  },
  presetLabel: { ...typography.styles.caption, fontWeight: '700', color: colors.text.primary },
  presetLabelActive: { color: CAREGIVER_COLOR },
  presetDesc: { ...typography.styles.caption, color: colors.text.tertiary, fontSize: 10, marginTop: 1 },
  presetDescActive: { color: CAREGIVER_COLOR },

  // Availability grid
  availGrid: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1, borderColor: colors.neutral[200],
    padding: spacing[2],
  },
  availRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  availDayCell: { width: 36, alignItems: 'center', justifyContent: 'center' },
  availDayText: { ...typography.styles.caption, color: colors.text.secondary, fontWeight: '600', fontSize: 11 },
  availHeaderCell: { width: 36, alignItems: 'center', justifyContent: 'center', marginHorizontal: 1 },
  availHeaderText: { ...typography.styles.caption, color: colors.text.tertiary, fontWeight: '600', fontSize: 9 },
  availHoursCell: { width: 28, alignItems: 'center', justifyContent: 'center' },
  availHoursHeader: { ...typography.styles.caption, color: colors.text.tertiary, fontWeight: '600', fontSize: 9 },
  availHoursText: { ...typography.styles.caption, color: colors.text.tertiary, fontSize: 11 },
  availCell: {
    width: 36, height: 32, marginHorizontal: 1,
    borderRadius: 6, backgroundColor: colors.neutral[100],
    justifyContent: 'center', alignItems: 'center',
  },
  availCellSelected: { backgroundColor: CAREGIVER_COLOR },
  availCellDisabled: { opacity: 0.35 },

  // Multiline inputs
  multilineInput: {
    ...typography.styles.body,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    minHeight: 100,
  },
  bioInput: {
    ...typography.styles.body,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    minHeight: 150,
  },
  bioGuide: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[2],
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Ratings
  ratingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[4],
    borderWidth: 1, borderColor: colors.neutral[200],
    marginBottom: spacing[2],
  },
  ratingsNote: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },

  // Actions
  actionSection: { gap: spacing[3], marginTop: spacing[6] },
  deactivateButton: {
    borderWidth: 1, borderColor: colors.neutral[300],
    paddingVertical: spacing[3], borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
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
  deactivateButtonTextActive: { color: colors.warning[700] },
});
