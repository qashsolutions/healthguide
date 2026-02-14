---
name: healthguide-careseeker-onboarding
description: Elder/careseeker profile setup and task preference selection. Collects personal info, address, emergency contacts, and care preferences. Uses large fonts and simple forms for elderly users. Use when building careseeker registration, profile setup, or care preference screens.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: careseeker
  tags: [onboarding, profile, preferences, elder]
---

# HealthGuide Careseeker Onboarding

## Overview
Careseekers (elders) are typically onboarded by family members or agency staff. The flow collects essential information: personal details, address (for EVV), emergency contacts, medical notes, and task preferences from the agency's task library.

## Key Features

- Simple, large-font forms for accessibility
- Step-by-step wizard (not overwhelming)
- Task selection from agency's library (icon-based)
- Emergency contact setup (up to 3 family members)
- Photo upload (optional)
- Address verification for EVV

## Data Models

```typescript
interface CareseekerProfile {
  id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  photo_url?: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  medical_notes?: string;
  special_instructions?: string;
  created_at: string;
}

interface EmergencyContact {
  id: string;
  elder_id: string;
  name: string;
  relationship: string;
  phone: string;
  receives_notifications: boolean;
  notification_preferences: {
    check_in: boolean;
    check_out: boolean;
    daily_report: boolean;
  };
}

interface TaskPreference {
  elder_id: string;
  task_id: string;
  is_required: boolean;
  frequency: 'every_visit' | 'daily' | 'weekly' | 'as_needed';
  special_instructions?: string;
}
```

## Instructions

### Step 1: Onboarding Flow Container

```typescript
// app/(protected)/careseeker/onboarding/index.tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PersonalInfoStep } from '@/components/onboarding/careseeker/PersonalInfoStep';
import { AddressStep } from '@/components/onboarding/careseeker/AddressStep';
import { EmergencyContactsStep } from '@/components/onboarding/careseeker/EmergencyContactsStep';
import { TaskPreferencesStep } from '@/components/onboarding/careseeker/TaskPreferencesStep';
import { ReviewStep } from '@/components/onboarding/careseeker/ReviewStep';

const STEPS = [
  { id: 'personal', title: 'Personal Info' },
  { id: 'address', title: 'Address' },
  { id: 'contacts', title: 'Family Contacts' },
  { id: 'tasks', title: 'Care Tasks' },
  { id: 'review', title: 'Review' },
];

export default function CareseekerOnboardingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    personal: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone: '',
      photo_url: null as string | null,
    },
    address: {
      address: '',
      apartment: '',
      city: '',
      state: '',
      zip_code: '',
      latitude: 0,
      longitude: 0,
    },
    contacts: [] as EmergencyContact[],
    tasks: [] as TaskPreference[],
    notes: {
      medical_notes: '',
      special_instructions: '',
    },
  });

  const updateFormData = (section: string, data: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section as keyof typeof prev], ...data },
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Create elder profile
      const { data: elder, error: elderError } = await supabase
        .from('elders')
        .insert({
          agency_id: user!.agency_id,
          ...formData.personal,
          ...formData.address,
          ...formData.notes,
        })
        .select()
        .single();

      if (elderError) throw elderError;

      // Create emergency contacts
      if (formData.contacts.length > 0) {
        const contactsToInsert = formData.contacts.map((contact) => ({
          ...contact,
          elder_id: elder.id,
        }));

        await supabase.from('emergency_contacts').insert(contactsToInsert);
      }

      // Create task preferences
      if (formData.tasks.length > 0) {
        const tasksToInsert = formData.tasks.map((task) => ({
          ...task,
          elder_id: elder.id,
        }));

        await supabase.from('elder_task_preferences').insert(tasksToInsert);
      }

      // Navigate to success or dashboard
      router.replace('/agency/careseekers');
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'personal':
        return (
          <PersonalInfoStep
            data={formData.personal}
            onUpdate={(data) => updateFormData('personal', data)}
            onNext={handleNext}
          />
        );
      case 'address':
        return (
          <AddressStep
            data={formData.address}
            onUpdate={(data) => updateFormData('address', data)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'contacts':
        return (
          <EmergencyContactsStep
            contacts={formData.contacts}
            onUpdate={(contacts) => setFormData((prev) => ({ ...prev, contacts }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'tasks':
        return (
          <TaskPreferencesStep
            agencyId={user!.agency_id}
            selectedTasks={formData.tasks}
            onUpdate={(tasks) => setFormData((prev) => ({ ...prev, tasks }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'review':
        return (
          <ReviewStep
            formData={formData}
            onSubmit={handleSubmit}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ProgressBar
        steps={STEPS}
        currentStep={currentStep}
      />
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
```

### Step 2: Personal Info Step

```typescript
// components/onboarding/careseeker/PersonalInfoStep.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { LargeInput } from '@/components/ui/LargeInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/Button';
import { CameraIcon, PersonIcon } from '@/components/icons';

interface Props {
  data: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string;
    photo_url: string | null;
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
}

export function PersonalInfoStep({ data, onUpdate, onNext }: Props) {
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploading(true);
      const file = result.assets[0];
      const fileName = `elder-${Date.now()}.jpg`;

      const { data: uploadData, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, {
          uri: file.uri,
          type: 'image/jpeg',
          name: fileName,
        } as any);

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        onUpdate({ photo_url: publicUrl });
      }
      setUploading(false);
    }
  };

  const isValid = data.first_name && data.last_name && data.phone;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Elder Information</Text>
      <Text style={styles.subtitle}>
        Enter the basic information for the person receiving care
      </Text>

      {/* Photo Upload */}
      <Pressable style={styles.photoContainer} onPress={handlePhotoUpload}>
        {data.photo_url ? (
          <Image source={{ uri: data.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <PersonIcon size={40} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.cameraButton}>
          <CameraIcon size={20} color="#FFFFFF" />
        </View>
      </Pressable>
      <Text style={styles.photoHint}>Tap to add photo (optional)</Text>

      <LargeInput
        label="First Name"
        value={data.first_name}
        onChangeText={(text) => onUpdate({ first_name: text })}
        placeholder="Enter first name"
        autoCapitalize="words"
      />

      <LargeInput
        label="Last Name"
        value={data.last_name}
        onChangeText={(text) => onUpdate({ last_name: text })}
        placeholder="Enter last name"
        autoCapitalize="words"
      />

      <DatePicker
        label="Date of Birth"
        value={data.date_of_birth}
        onChange={(date) => onUpdate({ date_of_birth: date })}
        maximumDate={new Date()}
      />

      <LargeInput
        label="Phone Number"
        value={data.phone}
        onChangeText={(text) => onUpdate({ phone: text })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={onNext}
          disabled={!isValid}
          size="large"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    marginTop: 32,
  },
});
```

### Step 3: Address Step with Geocoding

```typescript
// components/onboarding/careseeker/AddressStep.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { LargeInput } from '@/components/ui/LargeInput';
import { StatePicker } from '@/components/ui/StatePicker';
import { Button } from '@/components/ui/Button';

interface Props {
  data: {
    address: string;
    apartment: string;
    city: string;
    state: string;
    zip_code: string;
    latitude: number;
    longitude: number;
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AddressStep({ data, onUpdate, onNext, onBack }: Props) {
  const [verifying, setVerifying] = useState(false);

  const verifyAddress = async () => {
    setVerifying(true);

    try {
      const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip_code}`;

      const results = await Location.geocodeAsync(fullAddress);

      if (results.length > 0) {
        onUpdate({
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        });
        onNext();
      } else {
        Alert.alert(
          'Address Not Found',
          'We could not verify this address. Please check and try again.',
          [
            { text: 'Edit Address', style: 'cancel' },
            { text: 'Continue Anyway', onPress: onNext },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        'Could not verify address. Continue anyway?',
        [
          { text: 'Edit Address', style: 'cancel' },
          { text: 'Continue', onPress: onNext },
        ]
      );
    }

    setVerifying(false);
  };

  const isValid = data.address && data.city && data.state && data.zip_code;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home Address</Text>
      <Text style={styles.subtitle}>
        This address will be used for caregiver check-in verification
      </Text>

      <LargeInput
        label="Street Address"
        value={data.address}
        onChangeText={(text) => onUpdate({ address: text })}
        placeholder="123 Main Street"
        autoCapitalize="words"
      />

      <LargeInput
        label="Apartment/Unit (Optional)"
        value={data.apartment}
        onChangeText={(text) => onUpdate({ apartment: text })}
        placeholder="Apt 4B"
      />

      <LargeInput
        label="City"
        value={data.city}
        onChangeText={(text) => onUpdate({ city: text })}
        placeholder="City name"
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <StatePicker
            label="State"
            value={data.state}
            onChange={(state) => onUpdate({ state })}
          />
        </View>
        <View style={styles.halfWidth}>
          <LargeInput
            label="ZIP Code"
            value={data.zip_code}
            onChangeText={(text) => onUpdate({ zip_code: text })}
            placeholder="12345"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          onPress={onBack}
          style={styles.backButton}
        />
        <Button
          title="Verify & Continue"
          onPress={verifyAddress}
          disabled={!isValid}
          loading={verifying}
          style={styles.nextButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
```

### Step 4: Emergency Contacts Step

```typescript
// components/onboarding/careseeker/EmergencyContactsStep.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LargeInput } from '@/components/ui/LargeInput';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { PlusIcon, TrashIcon, PersonIcon } from '@/components/icons';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  receives_notifications: boolean;
  notification_preferences: {
    check_in: boolean;
    check_out: boolean;
    daily_report: boolean;
  };
}

interface Props {
  contacts: Contact[];
  onUpdate: (contacts: Contact[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const RELATIONSHIPS = [
  'Son', 'Daughter', 'Spouse', 'Sibling', 'Friend', 'Neighbor', 'Other'
];

export function EmergencyContactsStep({ contacts, onUpdate, onNext, onBack }: Props) {
  const addContact = () => {
    if (contacts.length >= 3) return;

    const newContact: Contact = {
      id: `temp-${Date.now()}`,
      name: '',
      relationship: '',
      phone: '',
      receives_notifications: true,
      notification_preferences: {
        check_in: true,
        check_out: true,
        daily_report: true,
      },
    };

    onUpdate([...contacts, newContact]);
  };

  const updateContact = (index: number, field: string, value: any) => {
    const updated = [...contacts];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      (updated[index] as any)[parent][child] = value;
    } else {
      (updated[index] as any)[field] = value;
    }
    onUpdate(updated);
  };

  const removeContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Family Contacts</Text>
      <Text style={styles.subtitle}>
        Add up to 3 family members who will receive care notifications via SMS
      </Text>

      {contacts.map((contact, index) => (
        <View key={contact.id} style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <PersonIcon size={20} color="#3B82F6" />
            </View>
            <Text style={styles.cardTitle}>Contact {index + 1}</Text>
            <Pressable
              style={styles.removeButton}
              onPress={() => removeContact(index)}
            >
              <TrashIcon size={20} color="#EF4444" />
            </Pressable>
          </View>

          <LargeInput
            label="Full Name"
            value={contact.name}
            onChangeText={(text) => updateContact(index, 'name', text)}
            placeholder="John Smith"
          />

          <View style={styles.relationshipPicker}>
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.relationshipOptions}>
              {RELATIONSHIPS.map((rel) => (
                <Pressable
                  key={rel}
                  style={[
                    styles.relationshipChip,
                    contact.relationship === rel && styles.relationshipChipActive,
                  ]}
                  onPress={() => updateContact(index, 'relationship', rel)}
                >
                  <Text
                    style={[
                      styles.relationshipText,
                      contact.relationship === rel && styles.relationshipTextActive,
                    ]}
                  >
                    {rel}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <LargeInput
            label="Phone Number"
            value={contact.phone}
            onChangeText={(text) => updateContact(index, 'phone', text)}
            placeholder="(555) 555-5555"
            keyboardType="phone-pad"
          />

          <View style={styles.notificationSection}>
            <Text style={styles.notificationTitle}>SMS Notifications</Text>
            <Checkbox
              label="Check-in alerts"
              checked={contact.notification_preferences.check_in}
              onChange={(val) =>
                updateContact(index, 'notification_preferences.check_in', val)
              }
            />
            <Checkbox
              label="Check-out alerts"
              checked={contact.notification_preferences.check_out}
              onChange={(val) =>
                updateContact(index, 'notification_preferences.check_out', val)
              }
            />
            <Checkbox
              label="Daily summary report"
              checked={contact.notification_preferences.daily_report}
              onChange={(val) =>
                updateContact(index, 'notification_preferences.daily_report', val)
              }
            />
          </View>
        </View>
      ))}

      {contacts.length < 3 && (
        <Pressable style={styles.addButton} onPress={addContact}>
          <PlusIcon size={24} color="#3B82F6" />
          <Text style={styles.addButtonText}>Add Family Contact</Text>
        </Pressable>
      )}

      {contacts.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No contacts added yet. You can add up to 3 family members.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          onPress={onBack}
          style={styles.backButton}
        />
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.nextButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  contactCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  removeButton: {
    padding: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  relationshipPicker: {
    marginBottom: 16,
  },
  relationshipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  relationshipChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  relationshipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  relationshipTextActive: {
    color: '#FFFFFF',
  },
  notificationSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
```

### Step 5: Task Preferences Step (Icon-Based)

```typescript
// components/onboarding/careseeker/TaskPreferencesStep.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { TaskIcon } from '@/components/icons';
import * as Haptics from 'expo-haptics';

interface Task {
  id: string;
  name: string;
  category: string;
  icon: string;
  default_frequency: string;
}

interface TaskPreference {
  task_id: string;
  is_required: boolean;
  frequency: string;
}

interface Props {
  agencyId: string;
  selectedTasks: TaskPreference[];
  onUpdate: (tasks: TaskPreference[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'personal_care', label: 'Personal Care', icon: '🧴' },
  { id: 'mobility', label: 'Mobility', icon: '🚶' },
  { id: 'nutrition', label: 'Nutrition', icon: '🍎' },
  { id: 'medication', label: 'Medication', icon: '💊' },
  { id: 'housekeeping', label: 'Housekeeping', icon: '🏠' },
  { id: 'companionship', label: 'Companionship', icon: '💬' },
];

export function TaskPreferencesStep({
  agencyId,
  selectedTasks,
  onUpdate,
  onNext,
  onBack,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('personal_care');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('task_library')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('name');

    if (data) setTasks(data);
    setLoading(false);
  }

  const toggleTask = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const existing = selectedTasks.find((t) => t.task_id === task.id);

    if (existing) {
      // Remove task
      onUpdate(selectedTasks.filter((t) => t.task_id !== task.id));
    } else {
      // Add task with default frequency
      onUpdate([
        ...selectedTasks,
        {
          task_id: task.id,
          is_required: false,
          frequency: task.default_frequency || 'every_visit',
        },
      ]);
    }
  };

  const isSelected = (taskId: string) =>
    selectedTasks.some((t) => t.task_id === taskId);

  const filteredTasks = tasks.filter((t) => t.category === activeCategory);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Care Tasks</Text>
        <Text style={styles.subtitle}>
          Select the tasks caregivers should perform during visits
        </Text>
        <Text style={styles.selectedCount}>
          {selectedTasks.length} tasks selected
        </Text>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.categoryTab,
              activeCategory === cat.id && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                activeCategory === cat.id && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Task Grid */}
      <ScrollView style={styles.taskScroll} contentContainerStyle={styles.taskGrid}>
        {filteredTasks.map((task) => (
          <Pressable
            key={task.id}
            style={[
              styles.taskCard,
              isSelected(task.id) && styles.taskCardSelected,
            ]}
            onPress={() => toggleTask(task)}
          >
            <Text style={styles.taskIcon}>{task.icon}</Text>
            <Text
              style={[
                styles.taskName,
                isSelected(task.id) && styles.taskNameSelected,
              ]}
              numberOfLines={2}
            >
              {task.name}
            </Text>
            {isSelected(task.id) && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          onPress={onBack}
          style={styles.backButton}
        />
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.nextButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  categoryScroll: {
    maxHeight: 80,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryTab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 80,
  },
  categoryTabActive: {
    backgroundColor: '#3B82F6',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  taskScroll: {
    flex: 1,
  },
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  taskCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  taskCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  taskIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  taskNameSelected: {
    color: '#1E40AF',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
```

## Accessibility Considerations

```typescript
// Large fonts (minimum 16px body, 28px headings)
// High contrast color ratios
// Touch targets minimum 48x48
// Voice-over labels for all interactive elements

<Pressable
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isSelected(task.id) }}
  accessibilityLabel={`${task.name} task, ${isSelected(task.id) ? 'selected' : 'not selected'}`}
>
```

## Troubleshooting

### Address geocoding fails
**Cause:** Invalid address format or API limit reached
**Solution:** Allow manual coordinate entry or continue without verification

### Photo upload fails
**Cause:** Large file size or network issues
**Solution:** Compress image before upload, show retry option

### Tasks not loading
**Cause:** Agency has no tasks in library
**Solution:** Show message directing to task library setup
