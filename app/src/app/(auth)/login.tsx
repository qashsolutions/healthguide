// HealthGuide Email Login Screen
// For Agency Owners - Deep Teal theme
// Per frontend-design skill - Role-based theming

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, AgencyOwnerIcon } from '@/components/icons';

// Agency Owner color (Deep Teal)
const AGENCY_COLOR = roleColors.agency_owner;

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    try {
      setError('');
      await signInWithEmail(email, password);
      // Navigation happens automatically via root layout redirect
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
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

        {/* Header with Agency Icon */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <AgencyOwnerIcon size={48} color={AGENCY_COLOR} />
          </View>
          <Text style={styles.title}>Agency Owner Login</Text>
          <Text style={styles.subtitle}>
            Sign in to manage your care agency
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@agency.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={error && !email ? 'Email is required' : undefined}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            error={error && !password ? 'Password is required' : undefined}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Button
            title="Sign In"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleLogin}
            style={[styles.submitButton, { backgroundColor: AGENCY_COLOR }]}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
          </Text>
          <Text
            style={styles.link}
            onPress={() => router.push('/(auth)/register')}
          >
            Register
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
    marginBottom: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AGENCY_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    ...typography.styles.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  submitButton: {
    marginTop: spacing[4],
  },
  errorText: {
    ...typography.styles.bodySmall,
    color: colors.error[500],
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: spacing[8],
  },
  footerText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  link: {
    ...typography.styles.body,
    color: AGENCY_COLOR,
    fontWeight: '600',
  },
});
