// HealthGuide Add Elder (Careseeker) Onboarding Screen
// Multi-step wizard for agency staff to add new elders

import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  PersonalInfoStep,
  AddressStep,
  EmergencyContactsStep,
  TaskPreferencesStep,
  ReviewStep,
} from '@/components/onboarding/careseeker';

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

interface TaskPreference {
  task_id: string;
  is_required: boolean;
  frequency: string;
}

const STEPS = [
  { id: 'personal', title: 'Personal Info' },
  { id: 'address', title: 'Address' },
  { id: 'contacts', title: 'Family' },
  { id: 'tasks', title: 'Tasks' },
  { id: 'review', title: 'Review' },
];

export default function AddElderScreen() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
    contacts: [] as Contact[],
    tasks: [] as TaskPreference[],
    notes: {
      medical_notes: '',
      special_instructions: '',
    },
  });

  const updateFormData = (section: keyof typeof formData, data: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: typeof data === 'function' ? data(prev[section]) : { ...prev[section], ...data },
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
    } else {
      // Go back to elders list
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!user?.agency_id) {
      Alert.alert('Error', 'Could not determine agency. Please try again.');
      return;
    }

    setSubmitting(true);

    try {
      // Create elder profile
      const { data: elder, error: elderError } = await supabase
        .from('elders')
        .insert({
          agency_id: user.agency_id,
          first_name: formData.personal.first_name,
          last_name: formData.personal.last_name,
          date_of_birth: formData.personal.date_of_birth || null,
          phone: formData.personal.phone,
          photo_url: formData.personal.photo_url,
          address: formData.address.address,
          apartment: formData.address.apartment || null,
          city: formData.address.city,
          state: formData.address.state,
          zip_code: formData.address.zip_code,
          latitude: formData.address.latitude || null,
          longitude: formData.address.longitude || null,
          medical_notes: formData.notes.medical_notes || null,
          special_instructions: formData.notes.special_instructions || null,
          is_active: true,
        })
        .select()
        .single();

      if (elderError) throw elderError;

      // Create emergency contacts
      if (formData.contacts.length > 0) {
        const contactsToInsert = formData.contacts.map((contact) => ({
          elder_id: elder.id,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          receives_notifications: contact.receives_notifications,
          notification_preferences: contact.notification_preferences,
        }));

        const { error: contactsError } = await supabase
          .from('emergency_contacts')
          .insert(contactsToInsert);

        if (contactsError) {
          console.error('Error creating contacts:', contactsError);
        }
      }

      // Create task preferences
      if (formData.tasks.length > 0) {
        const tasksToInsert = formData.tasks.map((task) => ({
          elder_id: elder.id,
          task_id: task.task_id,
          is_required: task.is_required,
          frequency: task.frequency,
        }));

        const { error: tasksError } = await supabase
          .from('elder_task_preferences')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Error creating task preferences:', tasksError);
        }
      }

      // Success - navigate back to elders list
      Alert.alert(
        'Elder Added',
        `${formData.personal.first_name} ${formData.personal.last_name} has been added successfully.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/agency/elders'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating elder:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to add elder. Please try again.'
      );
    }

    setSubmitting(false);
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
            agencyId={user?.agency_id || ''}
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
            submitting={submitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ProgressBar steps={STEPS} currentStep={currentStep} />
      <View style={styles.content}>{renderStep()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});
