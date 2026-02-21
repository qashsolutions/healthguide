// HealthGuide Student Signup
// Screen 1: Basic info + account creation with .edu email

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { StudentIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

function isEduEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('.edu');
}

function hasLetterAndNumber(pw: string): boolean {
  return /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

export default function SignupStudentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    age: '',
    collegeName: '',
    collegeCity: '',
    collegeState: '',
    collegeZip: '',
    eduEmail: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};

    if (form.fullName.trim().length < 2) e.fullName = 'Name is required (min 2 chars)';
    if (!form.age || parseInt(form.age) < 18) e.age = 'Must be 18 or older';
    if (!form.collegeName.trim()) e.collegeName = 'College name is required';
    if (!form.collegeCity.trim()) e.collegeCity = 'City is required';
    if (!form.collegeState.trim() || form.collegeState.length !== 2) e.collegeState = '2-letter state code required';
    if (form.collegeZip.length !== 5) e.collegeZip = '5-digit ZIP required';
    if (!form.eduEmail.trim()) {
      e.eduEmail = 'Email is required';
    } else if (!isEduEmail(form.eduEmail)) {
      e.eduEmail = 'Must be a .edu email address';
    }
    if (form.password.length < 8) {
      e.password = 'Min 8 characters';
    } else if (!hasLetterAndNumber(form.password)) {
      e.password = 'Must include at least 1 letter and 1 number';
    }
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;

    setLoading(true);
    try {
      const nameParts = form.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const email = form.eduEmail.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            role: 'caregiver',
            caregiver_type: 'student',
            phone: form.mobile.replace(/\D/g, '') || null,
            college_name: form.collegeName.trim(),
            college_city: form.collegeCity.trim(),
            college_state: form.collegeState.trim().toUpperCase(),
            college_zip: form.collegeZip.trim(),
          },
        },
      });

      if (error) throw error;

      // Create user_profiles row
      if (data.user) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: form.mobile.replace(/\D/g, '') || null,
          role: 'caregiver',
        });
      }

      setShowConfirmation(true);
    } catch (err: any) {
      const msg = err.message || 'Could not create account';
      if (Platform.OS === 'web') {
        setErrors({ submit: msg });
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // Email confirmation screen
  if (showConfirmation) {
    return (
      <>
        <Stack.Screen options={{ title: 'Check Your Email', headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIcon}>
              <StudentIcon size={48} color={colors.white} />
            </View>
            <Text style={styles.confirmTitle}>Verify Your Email</Text>
            <Text style={styles.confirmText}>
              We sent a verification link to{'\n'}
              <Text style={styles.confirmEmail}>{form.eduEmail.trim().toLowerCase()}</Text>
            </Text>
            <Text style={styles.confirmHint}>
              Check your .edu email inbox (and spam folder) for the verification link.
              Once verified, sign in to complete your profile.
            </Text>
            <Button
              title="Go to Sign In"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.confirmButton}
            />
            <Pressable onPress={() => router.replace('/' as any)}>
              <Text style={styles.backLink}>Back to Home</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Student Signup', headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <StudentIcon size={32} color={colors.white} />
              </View>
              <Text style={styles.headerTitle}>Join as a Student</Text>
              <Text style={styles.headerSubtitle}>
                Sign up with your .edu email to start earning
                companionship experience
              </Text>
            </View>

            {errors.submit && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.submit}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Full Name *"
                placeholder="Jane Smith"
                value={form.fullName}
                onChangeText={(t: string) => setForm({ ...form, fullName: t })}
                autoCapitalize="words"
                error={errors.fullName}
              />

              <Input
                label="Age *"
                placeholder="18"
                value={form.age}
                onChangeText={(t: string) => {
                  const cleaned = t.replace(/\D/g, '').slice(0, 2);
                  setForm({ ...form, age: cleaned });
                }}
                keyboardType="numeric"
                maxLength={2}
                error={errors.age}
              />

              <Input
                label="College/University Name *"
                placeholder="State University"
                value={form.collegeName}
                onChangeText={(t: string) => setForm({ ...form, collegeName: t })}
                autoCapitalize="words"
                error={errors.collegeName}
              />

              <View style={styles.row}>
                <View style={styles.flex}>
                  <Input
                    label="City *"
                    placeholder="Charlotte"
                    value={form.collegeCity}
                    onChangeText={(t: string) => setForm({ ...form, collegeCity: t })}
                    autoCapitalize="words"
                    error={errors.collegeCity}
                  />
                </View>
                <View style={styles.stateInput}>
                  <Input
                    label="State *"
                    placeholder="NC"
                    value={form.collegeState}
                    onChangeText={(t: string) => {
                      const cleaned = t.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
                      setForm({ ...form, collegeState: cleaned });
                    }}
                    autoCapitalize="characters"
                    maxLength={2}
                    error={errors.collegeState}
                  />
                </View>
                <View style={styles.zipInput}>
                  <Input
                    label="ZIP *"
                    placeholder="28202"
                    value={form.collegeZip}
                    onChangeText={(t: string) => {
                      const cleaned = t.replace(/\D/g, '').slice(0, 5);
                      setForm({ ...form, collegeZip: cleaned });
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                    error={errors.collegeZip}
                  />
                </View>
              </View>

              <Input
                label=".edu Email *"
                placeholder="jane@university.edu"
                value={form.eduEmail}
                onChangeText={(t: string) => setForm({ ...form, eduEmail: t })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.eduEmail}
                hint="Must be a .edu email address"
              />

              <Input
                label="Mobile Number"
                placeholder="(704) 555-1234"
                value={form.mobile}
                onChangeText={(t: string) => {
                  const digits = t.replace(/\D/g, '').slice(0, 10);
                  let formatted = digits;
                  if (digits.length >= 6) {
                    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                  } else if (digits.length >= 3) {
                    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                  }
                  setForm({ ...form, mobile: formatted });
                }}
                keyboardType="phone-pad"
                hint="Optional but recommended for visit notifications"
              />

              <Input
                label="Password *"
                placeholder="Min 8 chars, 1 letter + 1 number"
                value={form.password}
                onChangeText={(t: string) => setForm({ ...form, password: t })}
                secureTextEntry
                error={errors.password}
              />

              <Input
                label="Confirm Password *"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChangeText={(t: string) => setForm({ ...form, confirmPassword: t })}
                secureTextEntry
                error={errors.confirmPassword}
              />
            </View>

            {/* Submit */}
            <View style={styles.actions}>
              <Button
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                size="lg"
                style={styles.submitButton}
              />
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.signInLink}>
                  Already have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  headerSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errorBannerText: {
    ...typography.styles.bodySmall,
    color: colors.error[700],
    textAlign: 'center',
  },
  form: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  stateInput: {
    width: 80,
  },
  zipInput: {
    width: 100,
  },
  actions: {
    gap: spacing[3],
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#7C3AED',
  },
  signInLink: {
    ...typography.styles.body,
    color: colors.text.secondary,
    paddingVertical: spacing[2],
  },
  signInLinkBold: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  // Confirmation screen
  confirmContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  confirmTitle: {
    ...typography.styles.h2,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  confirmText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[3],
  },
  confirmEmail: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  confirmHint: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  confirmButton: {
    minWidth: 200,
    backgroundColor: '#7C3AED',
    marginBottom: spacing[3],
  },
  backLink: {
    ...typography.styles.body,
    color: colors.primary[500],
    fontWeight: '600',
    paddingVertical: spacing[2],
  },
});
