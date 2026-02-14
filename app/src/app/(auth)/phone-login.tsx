// HealthGuide Phone Login Screen
// For Caregivers and Elders - role-based theming

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets } from '@/theme/spacing';
import { ArrowLeftIcon, PhoneIcon, CaregiverIcon, ElderIcon } from '@/components/icons';

// Role configuration for consistent theming
const ROLE_CONFIG = {
  caregiver: {
    title: 'Caregiver Login',
    color: roleColors.caregiver,
    icon: CaregiverIcon,
  },
  careseeker: {
    title: 'Elder Login',
    color: roleColors.careseeker,
    icon: ElderIcon,
  },
} as const;

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { signInWithPhone, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Get role config (default to caregiver)
  const roleKey = (role === 'careseeker' ? 'careseeker' : 'caregiver') as keyof typeof ROLE_CONFIG;
  const config = ROLE_CONFIG[roleKey];
  const RoleIcon = config.icon;

  const handleSendOTP = async () => {
    // Basic phone validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setError('');
      const formattedPhone = cleanPhone.startsWith('1')
        ? `+${cleanPhone}`
        : `+1${cleanPhone}`;

      await signInWithPhone(formattedPhone);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: formattedPhone, role: role || 'caregiver' },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';

    if (cleaned.length > 0) {
      formatted = '(' + cleaned.substring(0, 3);
    }
    if (cleaned.length > 3) {
      formatted += ') ' + cleaned.substring(3, 6);
    }
    if (cleaned.length > 6) {
      formatted += '-' + cleaned.substring(6, 10);
    }

    return formatted;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Back Button */}
        <Button
          title=""
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={24} />}
          onPress={() => router.back()}
          style={styles.backButton}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
            <RoleIcon size={48} color={config.color} />
          </View>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to receive a verification code
          </Text>
        </View>

        {/* Phone Input - Large for easy typing */}
        <View style={styles.form}>
          <Input
            label="Phone Number"
            placeholder="(555) 123-4567"
            value={formatPhoneNumber(phone)}
            onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
            keyboardType="phone-pad"
            autoComplete="tel"
            size="caregiver"
            leftIcon={<Text style={styles.countryCode}>+1</Text>}
            error={error || undefined}
          />

          <Button
            title="Send Code"
            variant="primary"
            size={roleKey === 'careseeker' ? 'elder' : 'caregiver'}
            fullWidth
            loading={loading}
            onPress={handleSendOTP}
            style={[styles.submitButton, { backgroundColor: config.color }]}
          />
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            We'll send a 6-digit code to verify your phone number. Standard messaging rates may apply.
          </Text>
        </View>
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
    paddingHorizontal: spacing[6],
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginTop: spacing[8],
    marginBottom: spacing[8],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  form: {
    gap: spacing[6],
  },
  countryCode: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  submitButton: {
    marginTop: spacing[4],
  },
  helpSection: {
    marginTop: 'auto',
    paddingBottom: spacing[8],
  },
  helpText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
