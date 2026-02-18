// HealthGuide Agency Registration Screen
// For new agency owners - Deep Teal theme
// Per frontend-design skill - Role-based theming

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ArrowLeftIcon, AgencyOwnerIcon } from '@/components/icons';

// Agency Owner color (Deep Teal)
const AGENCY_COLOR = roleColors.agency_owner;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail, loading } = useAuth();
  const [formData, setFormData] = useState({
    agencyName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleChange = (field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleRegister = async () => {
    const { agencyName, fullName, email, password, confirmPassword } = formData;

    // Validation
    if (!agencyName || !fullName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setError('');
      // Sign up
      const nameParts = fullName.trim().split(/\s+/);
      await signUpWithEmail(email, password, {
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        full_name: fullName,
        role: 'agency_owner',
      });

      // Get the newly created user to create agency record
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id) {
        const { error: agencyError } = await supabase
          .from('agencies')
          .insert({
            owner_id: currentUser.id,
            name: agencyName,
            subscription_status: 'trial',
            elder_count: 0,
          });

        if (agencyError) {
          console.error('Failed to create agency:', agencyError);
          // Don't throw - user is created, they can set up agency later
        }
      }
      // Navigation happens automatically via AuthContext
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <Text style={styles.title}>Register Your Agency</Text>
            <Text style={styles.subtitle}>
              Set up your care agency in minutes
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Agency Name"
              placeholder="Sunny Day Home Care"
              value={formData.agencyName}
              onChangeText={handleChange('agencyName')}
              autoCapitalize="words"
            />

            <Input
              label="Your Full Name"
              placeholder="Jane Smith"
              value={formData.fullName}
              onChangeText={handleChange('fullName')}
              autoCapitalize="words"
              autoComplete="name"
            />

            <Input
              label="Email"
              placeholder="jane@sunnydayhc.com"
              value={formData.email}
              onChangeText={handleChange('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChangeText={handleChange('password')}
              secureTextEntry
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChangeText={handleChange('confirmPassword')}
              secureTextEntry
              autoComplete="new-password"
            />

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <Button
              title="Create Agency Account"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleRegister}
              style={[styles.submitButton, { backgroundColor: AGENCY_COLOR }]}
            />
          </View>

          {/* Pricing Info */}
          <View style={styles.pricingSection}>
            <Text style={styles.pricingTitle}>Simple Pricing</Text>
            <Text style={styles.pricingText}>
              $15/elder/month • Up to 20 elders • 14-day free trial
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Text
              style={styles.link}
              onPress={() => router.push('/(auth)/login')}
            >
              Sign In
            </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
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
    marginBottom: spacing[6],
  },
  submitButton: {
    marginTop: spacing[4],
  },
  errorText: {
    ...typography.styles.bodySmall,
    color: colors.error[500],
    textAlign: 'center',
  },
  pricingSection: {
    backgroundColor: AGENCY_COLOR + '10',
    padding: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: AGENCY_COLOR + '30',
  },
  pricingTitle: {
    ...typography.styles.label,
    color: AGENCY_COLOR,
    marginBottom: spacing[1],
  },
  pricingText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
