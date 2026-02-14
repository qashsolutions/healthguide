// HealthGuide OTP Verification Screen
// Per healthguide-core/auth skill - Large touch targets for caregivers
// Per frontend-design skill - Role-based theming

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button, OTPInput } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, CheckIcon, CaregiverIcon, ElderIcon } from '@/components/icons';

// Role configuration for consistent theming
const ROLE_CONFIG = {
  caregiver: {
    title: 'Verify Your Phone',
    color: roleColors.caregiver,
    icon: CaregiverIcon,
  },
  careseeker: {
    title: 'Verify Your Phone',
    color: roleColors.careseeker,
    icon: ElderIcon,
  },
} as const;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone, role } = useLocalSearchParams<{ phone: string; role: string }>();
  const { verifyOTP, signInWithPhone, loading } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  // Get role config (default to caregiver)
  const roleKey = (role === 'careseeker' ? 'careseeker' : 'caregiver') as keyof typeof ROLE_CONFIG;
  const config = ROLE_CONFIG[roleKey];
  const RoleIcon = config.icon;

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    try {
      setError('');
      await verifyOTP(phone, code);
      // Navigation happens automatically via AuthContext
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setCode('');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    try {
      await signInWithPhone(phone);
      setResendTimer(60);
      setError('');
    } catch (err: any) {
      setError('Failed to resend code');
    }
  };

  const formatPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return p;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <Button
          title=""
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={24} />}
          onPress={() => router.back()}
          style={styles.backButton}
        />

        {/* Header with Role Icon */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
            <RoleIcon size={48} color={config.color} />
          </View>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to
          </Text>
          <Text style={[styles.phoneNumber, { color: config.color }]}>{formatPhone(phone)}</Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpSection}>
          <OTPInput
            length={6}
            value={code}
            onChange={setCode}
            error={error}
          />
        </View>

        {/* Verify Button - Role-colored */}
        <Button
          title="Verify"
          variant="primary"
          size={roleKey === 'careseeker' ? 'elder' : 'caregiver'}
          fullWidth
          loading={loading}
          disabled={code.length !== 6}
          onPress={handleVerify}
          style={[styles.verifyButton, { backgroundColor: config.color }]}
          icon={code.length === 6 ? <CheckIcon size={28} color={colors.white} /> : undefined}
        />

        {/* Resend Section */}
        <View style={styles.resendSection}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <Pressable
            onPress={handleResend}
            disabled={resendTimer > 0}
          >
            <Text
              style={[
                styles.resendLink,
                { color: config.color },
                resendTimer > 0 && styles.resendDisabled,
              ]}
            >
              {resendTimer > 0
                ? `Resend in ${resendTimer}s`
                : 'Resend Code'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
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
  },
  phoneNumber: {
    ...typography.caregiver.body,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  otpSection: {
    marginBottom: spacing[8],
  },
  verifyButton: {
    marginBottom: spacing[6],
  },
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  resendLink: {
    ...typography.styles.body,
    fontWeight: '600',
  },
  resendDisabled: {
    color: colors.text.disabled,
  },
});
