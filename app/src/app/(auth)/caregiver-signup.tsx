// HealthGuide Caregiver Signup Screen
// Email OTP verification entry point for caregiver signup
// Per healthguide-core/auth skill - Large touch targets for caregivers
// Per frontend-design skill - Role-based theming with emerald

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, CaregiverIcon } from '@/components/icons';

const CAREGIVER_COLOR = roleColors.caregiver; // Emerald #059669

export default function CaregiverSignupScreen() {
  const router = useRouter();
  const { signInWithEmailOTP, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // BUG-3 fix: Clear any stale session so OTP flow doesn't redirect to
  // the previous user's dashboard when onAuthStateChange fires.
  useEffect(() => {
    async function clearStaleSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
    }
    clearStaleSession();
  }, []);

  const handleSendOTP = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      await signInWithEmailOTP(trimmedEmail, 'caregiver');
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: trimmedEmail,
          role: 'caregiver',
          signup: 'true',
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    }
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
          <View style={[styles.iconContainer, { backgroundColor: CAREGIVER_COLOR + '20' }]}>
            <CaregiverIcon size={48} color={CAREGIVER_COLOR} />
          </View>
          <Text style={styles.title}>Create Your Caregiver Profile</Text>
          <Text style={styles.subtitle}>
            Free — showcase your skills to agencies
          </Text>
        </View>

        {/* Email Input - Large for easy typing */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setError('');
              setEmail(text);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            size="caregiver"
            error={error || undefined}
          />

          <Button
            title="Send Code"
            variant="primary"
            size="caregiver"
            fullWidth
            loading={loading}
            onPress={handleSendOTP}
            style={[styles.submitButton, { backgroundColor: CAREGIVER_COLOR }]}
          />
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            We'll send a 6-digit code to your email to verify your identity.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.footerText, styles.link]}>
              Sign In
            </Text>
          </Pressable>
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
  submitButton: {
    marginTop: spacing[4],
  },
  helpSection: {
    marginTop: 'auto',
    paddingBottom: spacing[4],
  },
  helpText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing[8],
  },
  footerText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  link: {
    color: CAREGIVER_COLOR,
    fontWeight: '600',
  },
});
