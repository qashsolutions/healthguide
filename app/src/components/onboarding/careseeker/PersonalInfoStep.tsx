// HealthGuide Careseeker Onboarding - Personal Info Step
// Large fonts and simple forms for elderly users

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { LargeInput } from '@/components/ui/LargeInput';
import { Button } from '@/components/ui/Button';

interface PersonalData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  photo_url: string | null;
}

interface Props {
  data: PersonalData;
  onUpdate: (data: Partial<PersonalData>) => void;
  onNext: () => void;
}

function PersonIcon({ size = 40, color = '#9CA3AF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function CameraIcon({ size = 20, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
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

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      const file = result.assets[0];
      const fileName = `elder-${Date.now()}.jpg`;

      try {
        const response = await fetch(file.uri);
        const blob = await response.blob();

        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          onUpdate({ photo_url: urlData.publicUrl });
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
      setUploading(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      let formatted = '';
      if (match[1]) formatted = `(${match[1]}`;
      if (match[2]) formatted += `) ${match[2]}`;
      if (match[3]) formatted += `-${match[3]}`;
      return formatted;
    }
    return text;
  };

  const isValid = data.first_name.trim() && data.last_name.trim() && data.phone.length >= 14;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Elder Information</Text>
      <Text style={styles.subtitle}>
        Enter basic information for the person receiving care
      </Text>

      {/* Photo Upload */}
      <Pressable
        style={styles.photoContainer}
        onPress={handlePhotoUpload}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Add photo"
      >
        {data.photo_url ? (
          <Image source={{ uri: data.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <PersonIcon size={48} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.cameraButton}>
          <CameraIcon size={18} color="#FFFFFF" />
        </View>
      </Pressable>
      <Text style={styles.photoHint}>
        {uploading ? 'Uploading...' : 'Tap to add photo (optional)'}
      </Text>

      <LargeInput
        label="First Name"
        value={data.first_name}
        onChangeText={(text) => onUpdate({ first_name: text })}
        placeholder="Enter first name"
        autoCapitalize="words"
        autoComplete="given-name"
        accessibilityLabel="First name"
      />

      <LargeInput
        label="Last Name"
        value={data.last_name}
        onChangeText={(text) => onUpdate({ last_name: text })}
        placeholder="Enter last name"
        autoCapitalize="words"
        autoComplete="family-name"
        accessibilityLabel="Last name"
      />

      <LargeInput
        label="Date of Birth (Optional)"
        value={data.date_of_birth}
        onChangeText={(text) => onUpdate({ date_of_birth: text })}
        placeholder="MM/DD/YYYY"
        keyboardType="number-pad"
        accessibilityLabel="Date of birth"
      />

      <LargeInput
        label="Phone Number"
        value={data.phone}
        onChangeText={(text) => onUpdate({ phone: formatPhoneNumber(text) })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
        autoComplete="tel"
        accessibilityLabel="Phone number"
      />

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={onNext}
          disabled={!isValid}
          size="large"
          accessibilityLabel="Continue to next step"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    lineHeight: 24,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 32,
  },
  footer: {
    marginTop: 32,
  },
});
