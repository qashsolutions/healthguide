// HealthGuide Caregiver Profile Setup Screen
// Modern 3-step profile creation: Basic Info → Skills & Rate → Availability & About

import React, { useState, useRef, useEffect } from 'react';
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
import { Button, Input } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, shadows } from '@/theme/spacing';
import { ArrowLeftIcon, CheckIcon, CloseIcon } from '@/components/icons';
import * as ImagePicker from 'expo-image-picker';

const CAREGIVER_COLOR = roleColors.caregiver;

const MAX_CAPABILITIES = 5;

// Fallback tasks when no agency task_library is available
const FALLBACK_TASKS = [
  'Companionship',
  'Meal Preparation',
  'Light Housekeeping',
  'Errands & Shopping',
  'Transportation',
  'Pet Care',
  'Lawn & Yard Care',
  'Tutoring',
  'Grocery Shopping & Errands',
];

// Suggested keywords for discoverability
const SUGGESTED_KEYWORDS = [
  'Experienced',
  'Compassionate',
  'Reliable',
  'Patient',
  'Dementia Care',
  'Alzheimer\'s',
  'Post-Surgery',
  'Hospice Care',
  'Physical Therapy',
  'Spanish Speaking',
  'Bilingual',
  'CPR Certified',
  'First Aid',
  'Live-In Available',
  'Night Shifts',
  'Weekend Available',
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

const MAX_HOURS_PER_DAY = 8; // 4 slots × 2hrs
const MAX_SLOTS_PER_DAY = 4;

// Schedule presets for quick setup
const SCHEDULE_PRESETS = [
  {
    label: 'Full-Time',
    desc: 'Mon–Fri, 8am–4pm',
    build: () => {
      const weekday = ['8am-10am', '10am-12pm', '12pm-2pm', '2pm-4pm'];
      return { monday: weekday, tuesday: weekday, wednesday: weekday, thursday: weekday, friday: weekday, saturday: [] as string[], sunday: [] as string[] };
    },
  },
  {
    label: 'Mornings',
    desc: 'Mon–Fri, 6am–12pm',
    build: () => {
      const morning = ['6am-8am', '8am-10am', '10am-12pm'];
      return { monday: morning, tuesday: morning, wednesday: morning, thursday: morning, friday: morning, saturday: [] as string[], sunday: [] as string[] };
    },
  },
  {
    label: 'Evenings',
    desc: 'Mon–Fri, 4pm–10pm',
    build: () => {
      const evening = ['4pm-6pm', '6pm-8pm', '8pm-10pm'];
      return { monday: evening, tuesday: evening, wednesday: evening, thursday: evening, friday: evening, saturday: [] as string[], sunday: [] as string[] };
    },
  },
  {
    label: 'Weekends',
    desc: 'Sat–Sun, 8am–4pm',
    build: () => {
      const day = ['8am-10am', '10am-12pm', '12pm-2pm', '2pm-4pm'];
      return { monday: [] as string[], tuesday: [] as string[], wednesday: [] as string[], thursday: [] as string[], friday: [] as string[], saturday: day, sunday: day };
    },
  },
];

interface WorkEntry {
  title: string;
  employer: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface EducationEntry {
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface ReferenceEntry {
  name: string;
  phone: string;
  relationship: string;
}

interface FormData {
  fullName: string;
  zipCode: string;
  photoUri: string | null;
  certifications: string;
  hourlyRateMin: string;
  hourlyRateMax: string;
  capabilities: string[];
  keywords: string[];
  availability: Record<string, string[]>;
  experienceSummary: string;
  bio: string;
  workHistory: WorkEntry[];
  education: EducationEntry[];
  references: ReferenceEntry[];
}

export default function CaregiverProfileSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const taskInputRef = useRef<TextInput>(null);
  const keywordInputRef = useRef<TextInput>(null);

  const [dbTasks, setDbTasks] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rateError, setRateError] = useState('');

  // Platform-aware feedback: inline toast instead of window.alert on web
  const showToast = (message: string, type: 'success' | 'error', onDismiss?: () => void) => {
    if (Platform.OS !== 'web') {
      const title = type === 'success' ? 'Success' : 'Error';
      Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
      return;
    }
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
      onDismiss?.();
    }, 3000);
  };

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    zipCode: '',
    photoUri: null,
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
    workHistory: [{ title: '', employer: '', location: '', startDate: '', endDate: '' }],
    education: [{ institution: '', location: '', startDate: '', endDate: '' }],
    references: [{ name: '', phone: '', relationship: '' }],
  });

  // Fetch task names from agency's task_library if caregiver is linked
  useEffect(() => {
    async function loadAgencyTasks() {
      if (!user?.agency_id) return;
      const { data } = await supabase
        .from('task_library')
        .select('name')
        .eq('agency_id', user.agency_id)
        .eq('is_active', true)
        .order('name');
      if (data && data.length > 0) {
        setDbTasks(data.map(t => t.name));
      }
    }
    loadAgencyTasks();
  }, [user?.agency_id]);

  const suggestedTasks = dbTasks.length > 0 ? dbTasks : FALLBACK_TASKS;

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
      showToast('Could not pick image', 'error');
    }
  };

  // --- Tag input helpers ---
  const addTask = (task: string) => {
    const trimmed = task.trim();
    if (trimmed && !formData.capabilities.includes(trimmed) && formData.capabilities.length < MAX_CAPABILITIES) {
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

  // --- Availability helpers ---
  const getDayHours = (day: string) => (formData.availability[day] || []).length * 2;

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

  // --- Work/Education/Reference helpers ---
  const updateWorkEntry = (index: number, field: keyof WorkEntry, value: string) => {
    const updated = [...formData.workHistory];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, workHistory: updated });
  };

  const addWorkEntry = () => {
    if (formData.workHistory.length < 3) {
      setFormData({ ...formData, workHistory: [...formData.workHistory, { title: '', employer: '', location: '', startDate: '', endDate: '' }] });
    }
  };

  const removeWorkEntry = (index: number) => {
    if (formData.workHistory.length > 1) {
      setFormData({ ...formData, workHistory: formData.workHistory.filter((_, i) => i !== index) });
    }
  };

  const updateEducationEntry = (index: number, field: keyof EducationEntry, value: string) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, education: updated });
  };

  const addEducationEntry = () => {
    if (formData.education.length < 2) {
      setFormData({ ...formData, education: [...formData.education, { institution: '', location: '', startDate: '', endDate: '' }] });
    }
  };

  const removeEducationEntry = (index: number) => {
    if (formData.education.length > 1) {
      setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
    }
  };

  const updateReference = (index: number, field: keyof ReferenceEntry, value: string) => {
    const updated = [...formData.references];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, references: updated });
  };

  const addReference = () => {
    if (formData.references.length < 2) {
      setFormData({ ...formData, references: [...formData.references, { name: '', phone: '', relationship: '' }] });
    }
  };

  const removeReference = (index: number) => {
    if (formData.references.length > 1) {
      setFormData({ ...formData, references: formData.references.filter((_, i) => i !== index) });
    }
  };

  // --- Validation ---
  const isStep1Valid = formData.fullName.trim().length > 0 && formData.zipCode.length === 5 && formData.photoUri !== null;

  const isStep2Valid = () => {
    // At least 1 reference with name and phone
    return formData.references.some(r => r.name.trim().length > 0 && r.phone.trim().length >= 10);
  };

  const handleNext = () => {
    if (step === 1 && !isStep1Valid) return;
    if (step === 2 && !isStep2Valid()) {
      showToast('At least one reference with name and phone is required', 'error');
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCompleteProfile = async () => {
    if (!isStep1Valid) return;

    // UI Issue 6: Validate rate range (min must not exceed max)
    if (formData.hourlyRateMin && formData.hourlyRateMax) {
      const min = parseFloat(formData.hourlyRateMin);
      const max = parseFloat(formData.hourlyRateMax);
      if (max < min) {
        setRateError(`Must be ≥ $${formData.hourlyRateMin}`);
        setStep(3); // Jump back to step 3 if submitting from step 4
        return;
      }
    }

    setLoading(true);
    try {
      const certs = formData.certifications
        .split(',').map(c => c.trim()).filter(c => c.length > 0);

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

      // Clean work history / education / references — only include entries with content
      const cleanWorkHistory = formData.workHistory
        .filter(w => w.title.trim() || w.employer.trim())
        .map(w => ({
          title: w.title.trim(),
          employer: w.employer.trim(),
          location: w.location.trim(),
          start_date: w.startDate.trim(),
          end_date: w.endDate.trim() || 'Present',
        }));

      const cleanEducation = formData.education
        .filter(e => e.institution.trim())
        .map(e => ({
          institution: e.institution.trim(),
          location: e.location.trim(),
          start_date: e.startDate.trim(),
          end_date: e.endDate.trim() || 'Present',
        }));

      const cleanReferences = formData.references
        .filter(r => r.name.trim() && r.phone.trim())
        .map(r => ({
          name: r.name.trim(),
          phone: r.phone.trim(),
          relationship: r.relationship.trim() || 'Reference',
        }));

      const { error: insertError } = await supabase
        .from('caregiver_profiles')
        .insert({
          user_id: user?.id,
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
          work_history: cleanWorkHistory,
          education: cleanEducation,
          caregiver_references: cleanReferences,
        });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'caregiver', has_profile: true },
      });
      if (updateError) throw updateError;

      showToast('Profile created! Agencies can now find you.', 'success', () => {
        router.replace('/(protected)/caregiver/(tabs)');
      });
    } catch (err: any) {
      showToast(err.message || 'Could not create profile', 'error');
    }
    setLoading(false);
  };

  // --- Tag chips component ---
  const TagChips = ({ tags, onRemove, color }: { tags: string[]; onRemove: (t: string) => void; color: string }) => (
    <View style={s.tagChipsRow}>
      {tags.map(tag => (
        <View key={tag} style={[s.tagChip, { backgroundColor: color + '15', borderColor: color }]}>
          <Text style={[s.tagChipText, { color }]}>{tag}</Text>
          <Pressable onPress={() => onRemove(tag)} hitSlop={8}>
            <CloseIcon size={14} color={color} />
          </Pressable>
        </View>
      ))}
    </View>
  );

  // --- Suggestion chips component ---
  const SuggestionChips = ({ suggestions, selected, onToggle, maxReached }: {
    suggestions: string[]; selected: string[]; onToggle: (s: string) => void; maxReached?: boolean;
  }) => (
    <View style={s.suggestionsRow}>
      {suggestions.filter(s => !selected.includes(s)).slice(0, 8).map(item => (
        <Pressable
          key={item}
          style={[s.suggestionChip, maxReached && { opacity: 0.4 }]}
          onPress={() => !maxReached && onToggle(item)}
          disabled={maxReached}
        >
          <Text style={s.suggestionChipText}>+ {item}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.keyboardView}
      >
        {/* Header with back button */}
        <View style={s.headerBar}>
          {step > 1 ? (
            <Pressable onPress={handleBack} hitSlop={12}>
              <ArrowLeftIcon size={24} color={colors.text.primary} />
            </Pressable>
          ) : <View style={{ width: 24 }} />}
          <Text style={s.headerTitle}>
            {step === 1 ? 'Basic Info' : step === 2 ? 'Experience' : step === 3 ? 'Skills & Rate' : 'Schedule & About'}
          </Text>
          <Text style={s.stepLabel}>{step}/4</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(step / 4) * 100}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <View style={s.stepContainer}>
              <Text style={s.stepTitle}>Let's get started</Text>
              <Text style={s.stepSubtitle}>Basic details to set up your profile</Text>

              <View style={s.form}>
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

                <View>
                  <Text style={s.label}>Photo *</Text>
                  <Text style={s.inputHint}>Required — helps agencies identify you</Text>
                  <Pressable onPress={handlePickImage} style={[s.photoButton, !formData.photoUri && s.photoButtonRequired]}>
                    {formData.photoUri ? (
                      <Image source={{ uri: formData.photoUri }} style={s.photoImage} />
                    ) : (
                      <View style={s.photoPlaceholder}>
                        <Text style={s.photoPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: Experience & References */}
          {step === 2 && (
            <View style={s.stepContainer}>
              <Text style={s.stepTitle}>Your background</Text>
              <Text style={s.stepSubtitle}>Work history, education, and references</Text>

              <View style={s.form}>
                {/* Work History */}
                <View>
                  <Text style={s.label}>Work History</Text>
                  {formData.workHistory.map((job, index) => (
                    <View key={`work-${index}`} style={s.entryCard}>
                      <View style={s.entryCardHeader}>
                        <Text style={s.entryCardTitle}>Position {index + 1}</Text>
                        {formData.workHistory.length > 1 && (
                          <Pressable onPress={() => removeWorkEntry(index)} hitSlop={8}>
                            <CloseIcon size={18} color={colors.error[500]} />
                          </Pressable>
                        )}
                      </View>
                      <Input
                        label="Job Title"
                        placeholder="e.g. Home Care Aid"
                        value={job.title}
                        onChangeText={text => updateWorkEntry(index, 'title', text)}
                        size="caregiver"
                      />
                      <Input
                        label="Employer"
                        placeholder="e.g. Comfort Keepers"
                        value={job.employer}
                        onChangeText={text => updateWorkEntry(index, 'employer', text)}
                        size="caregiver"
                      />
                      <Input
                        label="Location"
                        placeholder="e.g. Charlotte, NC"
                        value={job.location}
                        onChangeText={text => updateWorkEntry(index, 'location', text)}
                        size="caregiver"
                      />
                      <View style={s.dateRow}>
                        <View style={{ flex: 1 }}>
                          <Input
                            label="Start"
                            placeholder="Jan 2020"
                            value={job.startDate}
                            onChangeText={text => updateWorkEntry(index, 'startDate', text)}
                            size="caregiver"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input
                            label="End"
                            placeholder="Present"
                            value={job.endDate}
                            onChangeText={text => updateWorkEntry(index, 'endDate', text)}
                            size="caregiver"
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  {formData.workHistory.length < 3 && (
                    <Pressable onPress={addWorkEntry} style={s.addEntryButton}>
                      <Text style={s.addEntryText}>+ Add Another Position</Text>
                    </Pressable>
                  )}
                </View>

                {/* Education */}
                <View>
                  <Text style={s.label}>Education</Text>
                  {formData.education.map((edu, index) => (
                    <View key={`edu-${index}`} style={s.entryCard}>
                      <View style={s.entryCardHeader}>
                        <Text style={s.entryCardTitle}>School {index + 1}</Text>
                        {formData.education.length > 1 && (
                          <Pressable onPress={() => removeEducationEntry(index)} hitSlop={8}>
                            <CloseIcon size={18} color={colors.error[500]} />
                          </Pressable>
                        )}
                      </View>
                      <Input
                        label="Institution"
                        placeholder="e.g. Central Piedmont CC"
                        value={edu.institution}
                        onChangeText={text => updateEducationEntry(index, 'institution', text)}
                        size="caregiver"
                      />
                      <Input
                        label="Location"
                        placeholder="e.g. Charlotte, NC"
                        value={edu.location}
                        onChangeText={text => updateEducationEntry(index, 'location', text)}
                        size="caregiver"
                      />
                      <View style={s.dateRow}>
                        <View style={{ flex: 1 }}>
                          <Input
                            label="Start"
                            placeholder="Aug 2018"
                            value={edu.startDate}
                            onChangeText={text => updateEducationEntry(index, 'startDate', text)}
                            size="caregiver"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input
                            label="End"
                            placeholder="May 2020"
                            value={edu.endDate}
                            onChangeText={text => updateEducationEntry(index, 'endDate', text)}
                            size="caregiver"
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  {formData.education.length < 2 && (
                    <Pressable onPress={addEducationEntry} style={s.addEntryButton}>
                      <Text style={s.addEntryText}>+ Add Another School</Text>
                    </Pressable>
                  )}
                </View>

                {/* References */}
                <View>
                  <Text style={s.label}>References * (at least 1)</Text>
                  <Text style={s.inputHint}>Provide at least one reference with name and phone number</Text>
                  {formData.references.map((ref, index) => (
                    <View key={`ref-${index}`} style={s.entryCard}>
                      <View style={s.entryCardHeader}>
                        <Text style={s.entryCardTitle}>Reference {index + 1}</Text>
                        {formData.references.length > 1 && (
                          <Pressable onPress={() => removeReference(index)} hitSlop={8}>
                            <CloseIcon size={18} color={colors.error[500]} />
                          </Pressable>
                        )}
                      </View>
                      <Input
                        label="Name *"
                        placeholder="e.g. Patricia Anderson"
                        value={ref.name}
                        onChangeText={text => updateReference(index, 'name', text)}
                        autoCapitalize="words"
                        size="caregiver"
                      />
                      <Input
                        label="Phone *"
                        placeholder="(704) 555-1234"
                        value={ref.phone}
                        onChangeText={text => {
                          const digits = text.replace(/\D/g, '').slice(0, 10);
                          let formatted = digits;
                          if (digits.length >= 6) {
                            formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
                          } else if (digits.length >= 3) {
                            formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
                          }
                          updateReference(index, 'phone', formatted);
                        }}
                        keyboardType="phone-pad"
                        size="caregiver"
                      />
                      <Input
                        label="Relationship"
                        placeholder="e.g. Former Supervisor"
                        value={ref.relationship}
                        onChangeText={text => updateReference(index, 'relationship', text)}
                        size="caregiver"
                      />
                    </View>
                  ))}
                  {formData.references.length < 2 && (
                    <Pressable onPress={addReference} style={s.addEntryButton}>
                      <Text style={s.addEntryText}>+ Add Second Reference</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Skills & Rate */}
          {step === 3 && (
            <View style={s.stepContainer}>
              <Text style={s.stepTitle}>Your skills</Text>
              <Text style={s.stepSubtitle}>Tell agencies what you can do</Text>

              <View style={s.form}>
                {/* Tasks / Capabilities */}
                <View>
                  <Text style={s.label}>Tasks You Can Perform ({formData.capabilities.length}/{MAX_CAPABILITIES})</Text>
                  {formData.capabilities.length > 0 && (
                    <TagChips tags={formData.capabilities} onRemove={removeTask} color={CAREGIVER_COLOR} />
                  )}
                  {formData.capabilities.length < MAX_CAPABILITIES ? (
                    <>
                      <TextInput
                        ref={taskInputRef}
                        style={s.tagInput}
                        placeholder="Type a task and press comma to add..."
                        placeholderTextColor={colors.text.disabled}
                        value={taskInput}
                        onChangeText={handleTaskInputChange}
                        onSubmitEditing={() => { if (taskInput.trim()) addTask(taskInput); }}
                        returnKeyType="done"
                      />
                      <Text style={s.inputHint}>Tap suggestions or type your own</Text>
                    </>
                  ) : (
                    <Text style={s.inputHint}>Maximum {MAX_CAPABILITIES} tasks selected</Text>
                  )}
                  <SuggestionChips
                    suggestions={suggestedTasks}
                    selected={formData.capabilities}
                    onToggle={addTask}
                    maxReached={formData.capabilities.length >= MAX_CAPABILITIES}
                  />
                </View>

                {/* Certifications */}
                <Input
                  label="Certifications"
                  placeholder="CNA, HHA, LPN, RN..."
                  value={formData.certifications}
                  onChangeText={text => setFormData({ ...formData, certifications: text })}
                  autoCapitalize="characters"
                  size="caregiver"
                />

                {/* Hourly Rate Range */}
                <View>
                  <Text style={s.label}>Hourly Rate Range</Text>
                  <View style={s.rateRangeRow}>
                    <View style={s.rateInputWrapper}>
                      <Input
                        placeholder="Min"
                        value={formData.hourlyRateMin}
                        onChangeText={text => {
                          const cleaned = text.replace(/[^\d.]/g, '').slice(0, 3);
                          setFormData({ ...formData, hourlyRateMin: cleaned });
                          if (rateError) setRateError('');
                        }}
                        keyboardType="decimal-pad"
                        maxLength={3}
                        size="caregiver"
                        leftIcon={<Text style={s.currencyIcon}>$</Text>}
                      />
                    </View>
                    <Text style={s.rateDash}>—</Text>
                    <View style={s.rateInputWrapper}>
                      <Input
                        placeholder="Max"
                        value={formData.hourlyRateMax}
                        onChangeText={text => {
                          const cleaned = text.replace(/[^\d.]/g, '').slice(0, 3);
                          setFormData({ ...formData, hourlyRateMax: cleaned });
                          // Inline validation: max must be ≥ min
                          if (cleaned && formData.hourlyRateMin) {
                            const min = parseFloat(formData.hourlyRateMin);
                            const max = parseFloat(cleaned);
                            if (max < min) {
                              setRateError(`Must be ≥ $${formData.hourlyRateMin}`);
                            } else {
                              setRateError('');
                            }
                          } else {
                            setRateError('');
                          }
                        }}
                        keyboardType="decimal-pad"
                        size="caregiver"
                        leftIcon={<Text style={s.currencyIcon}>$</Text>}
                        error={rateError || undefined}
                      />
                    </View>
                    <Text style={s.rateUnit}>/hr</Text>
                  </View>
                </View>

                {/* Keywords */}
                <View>
                  <Text style={s.label}>Keywords</Text>
                  <Text style={s.inputHint}>Help agencies find you by adding searchable keywords</Text>
                  {formData.keywords.length > 0 && (
                    <TagChips tags={formData.keywords} onRemove={removeKeyword} color={colors.info[600]} />
                  )}
                  <TextInput
                    ref={keywordInputRef}
                    style={s.tagInput}
                    placeholder="Type a keyword and press comma..."
                    placeholderTextColor={colors.text.disabled}
                    value={keywordInput}
                    onChangeText={handleKeywordInputChange}
                    onSubmitEditing={() => { if (keywordInput.trim()) addKeyword(keywordInput); }}
                    returnKeyType="done"
                  />
                  <SuggestionChips
                    suggestions={SUGGESTED_KEYWORDS}
                    selected={formData.keywords}
                    onToggle={addKeyword}
                  />
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: Availability & About */}
          {step === 4 && (
            <View style={s.stepContainer}>
              <Text style={s.stepTitle}>Your schedule</Text>
              <Text style={s.stepSubtitle}>Set your availability (max {MAX_HOURS_PER_DAY}hrs/day)</Text>

              {/* Schedule presets */}
              <View style={s.presetsRow}>
                {SCHEDULE_PRESETS.map(preset => (
                  <Pressable
                    key={preset.label}
                    style={[s.presetChip, activePreset === preset.label && s.presetChipActive]}
                    onPress={() => applyPreset(preset)}
                  >
                    <Text style={[
                      s.presetLabel,
                      activePreset === preset.label && s.presetLabelActive,
                    ]}>{preset.label}</Text>
                    <Text style={[
                      s.presetDesc,
                      activePreset === preset.label && s.presetDescActive,
                    ]}>{preset.desc}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Availability grid */}
              <View style={s.availGrid}>
                {/* Time header */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={s.availRow}>
                      <View style={s.availDayCell} />
                      {TIME_SLOTS.map(slot => (
                        <View key={slot.value} style={s.availHeaderCell}>
                          <Text style={s.availHeaderText}>{slot.label}</Text>
                        </View>
                      ))}
                      <View style={s.availHoursCell}>
                        <Text style={s.availHoursHeader}>Hrs</Text>
                      </View>
                    </View>

                    {/* Day rows */}
                    {DAYS.map(day => {
                      const daySlots = formData.availability[day] || [];
                      const hours = daySlots.length * 2;
                      const atMax = daySlots.length >= MAX_SLOTS_PER_DAY;
                      return (
                        <View key={day} style={s.availRow}>
                          <View style={s.availDayCell}>
                            <Text style={s.availDayText}>{DAY_LABELS[day]}</Text>
                          </View>
                          {TIME_SLOTS.map(slot => {
                            const isSelected = daySlots.includes(slot.value);
                            const isDisabled = !isSelected && atMax;
                            return (
                              <Pressable
                                key={slot.value}
                                style={[
                                  s.availCell,
                                  isSelected && s.availCellSelected,
                                  isDisabled && s.availCellDisabled,
                                ]}
                                onPress={() => !isDisabled && toggleAvailabilitySlot(day, slot.value)}
                              >
                                {isSelected && <CheckIcon size={12} color={colors.white} />}
                              </Pressable>
                            );
                          })}
                          <View style={s.availHoursCell}>
                            <Text style={[
                              s.availHoursText,
                              hours > 0 && { color: CAREGIVER_COLOR, fontWeight: '700' as const },
                            ]}>{hours}h</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* About section */}
              <View style={[s.form, { marginTop: spacing[6] }]}>
                <View>
                  <Text style={s.label}>Experience Summary</Text>
                  <TextInput
                    style={s.multilineInput}
                    placeholder="Describe your caregiving experience..."
                    value={formData.experienceSummary}
                    onChangeText={text => setFormData({ ...formData, experienceSummary: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor={colors.text.disabled}
                  />
                </View>

                <View>
                  <Text style={s.label}>Bio</Text>
                  <TextInput
                    style={s.bioInput}
                    placeholder="Tell agencies about yourself..."
                    value={formData.bio}
                    onChangeText={text => setFormData({ ...formData, bio: text })}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    placeholderTextColor={colors.text.disabled}
                  />
                  <Text style={s.bioGuide}>
                    Share what makes you unique — your personality, approach to care, and why you love caregiving
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View style={s.buttonContainer}>
            {step < 4 ? (
              <>
                <Button
                  title="Continue"
                  variant="primary"
                  size="caregiver"
                  fullWidth
                  disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid())}
                  onPress={handleNext}
                  style={{ backgroundColor: CAREGIVER_COLOR }}
                />
                {step > 2 && (
                  <Pressable onPress={() => setStep(step + 1)} style={s.skipButton}>
                    <Text style={s.skipText}>Skip for now</Text>
                  </Pressable>
                )}
              </>
            ) : (
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
                <Pressable onPress={() => router.replace('/(protected)/caregiver/(tabs)')} style={s.skipButton}>
                  <Text style={s.skipText}>Skip — I'll fill this in later</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Inline toast for web — rendered last to overlay content */}
      {toast && (
        <View style={[
          s.toast,
          toast.type === 'success' ? s.toastSuccess : s.toastError,
        ]}>
          <Text style={s.toastText}>{toast.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  stepLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // Progress bar
  progressBar: {
    height: 3,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing[4],
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: CAREGIVER_COLOR,
    borderRadius: 2,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  stepContainer: { marginBottom: spacing[4] },
  stepTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  form: { gap: spacing[5] },

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

  // Entry cards (work, education, references)
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  entryCardTitle: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  addEntryButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CAREGIVER_COLOR,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  addEntryText: {
    ...typography.styles.caption,
    color: CAREGIVER_COLOR,
    fontWeight: '600',
  },

  // Photo
  photoButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoButtonRequired: {
    borderColor: colors.error[300],
    borderWidth: 2,
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  photoPlaceholderText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5] || 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagChipText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },

  // Suggestion chips
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5] || 6,
  },
  suggestionChip: {
    paddingHorizontal: spacing[2.5] || 10,
    paddingVertical: spacing[1],
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  suggestionChipText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },

  // Schedule presets
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  presetChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    minWidth: 100,
  },
  presetChipActive: {
    backgroundColor: CAREGIVER_COLOR + '12',
    borderColor: CAREGIVER_COLOR,
  },
  presetLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  presetLabelActive: { color: CAREGIVER_COLOR },
  presetDesc: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 1,
  },
  presetDescActive: { color: CAREGIVER_COLOR },

  // Availability grid
  availGrid: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing[2],
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  availDayCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availDayText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 11,
  },
  availHeaderCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  availHeaderText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    fontSize: 9,
  },
  availHoursCell: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availHoursHeader: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    fontSize: 9,
  },
  availHoursText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  availCell: {
    width: 36,
    height: 32,
    marginHorizontal: 1,
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  availCellSelected: {
    backgroundColor: CAREGIVER_COLOR,
  },
  availCellDisabled: {
    opacity: 0.35,
  },

  // Multiline inputs
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
  },
  bioInput: {
    ...typography.styles.body,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
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

  // Buttons
  buttonContainer: {
    gap: spacing[3],
    marginTop: spacing[8],
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

  // Toast (web-friendly replacement for Alert.alert)
  toast: {
    position: 'fixed' as any,
    top: 40,
    left: spacing[4],
    right: spacing[4],
    zIndex: 9999,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 12,
    ...shadows.md,
  },
  toastSuccess: {
    backgroundColor: CAREGIVER_COLOR,
  },
  toastError: {
    backgroundColor: colors.error[600] || '#dc2626',
  },
  toastText: {
    ...typography.styles.body,
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
});
