// HealthGuide 55+ Companion Signup
// Screen 1: Basic info + account creation with DOB validation (must be 55+)

import { useState, useRef } from 'react';
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
import { CompanionIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

const COMPANION_COLOR = '#059669'; // success[600]

const MONTHS = [
  { label: 'Jan', value: 1 }, { label: 'Feb', value: 2 }, { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 }, { label: 'May', value: 5 }, { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 }, { label: 'Aug', value: 8 }, { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Dec', value: 12 },
];

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function hasLetterAndNumber(pw: string): boolean {
  return /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

// Year range: person must be 55–100
const currentYear = new Date().getFullYear();
const MIN_YEAR = currentYear - 100;
const MAX_YEAR = currentYear - 55;

function generateYears(): number[] {
  const years: number[] = [];
  for (let y = MAX_YEAR; y >= MIN_YEAR; y--) {
    years.push(y);
  }
  return years;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export default function SignupCompanionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    dobMonth: 0,
    dobDay: 0,
    dobYear: 0,
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const YEARS = useRef(generateYears()).current;

  function validate(): boolean {
    const e: Record<string, string> = {};

    if (form.fullName.trim().length < 2) e.fullName = 'Name is required (min 2 chars)';

    // DOB validation
    if (!form.dobMonth || !form.dobDay || !form.dobYear) {
      e.dob = 'Date of birth is required';
    } else {
      const maxDay = daysInMonth(form.dobMonth, form.dobYear);
      if (form.dobDay > maxDay) {
        e.dob = `Invalid day for selected month (max ${maxDay})`;
      } else {
        const dob = new Date(form.dobYear, form.dobMonth - 1, form.dobDay);
        const age = calculateAge(dob);
        if (age < 55) e.dob = 'Must be 55 or older to join as a companion';
        if (age > 100) e.dob = 'Please check your date of birth';
      }
    }

    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Please enter a valid email address';
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
      const email = form.email.trim().toLowerCase();
      const dobStr = `${form.dobYear}-${String(form.dobMonth).padStart(2, '0')}-${String(form.dobDay).padStart(2, '0')}`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            role: 'caregiver',
            caregiver_type: 'companion_55',
            phone: form.mobile.replace(/\D/g, '') || null,
            date_of_birth: dobStr,
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
              <CompanionIcon size={48} color={colors.white} />
            </View>
            <Text style={styles.confirmTitle}>Verify Your Email</Text>
            <Text style={styles.confirmText}>
              We sent a verification link to{'\n'}
              <Text style={styles.confirmEmail}>{form.email.trim().toLowerCase()}</Text>
            </Text>
            <Text style={styles.confirmHint}>
              Check your inbox (and spam folder) for the verification link.
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

  // Compute max day for currently selected month/year
  const maxDays = form.dobMonth && form.dobYear
    ? daysInMonth(form.dobMonth, form.dobYear)
    : 31;

  return (
    <>
      <Stack.Screen options={{ title: '55+ Companion Signup', headerBackTitle: 'Back' }} />
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
                <CompanionIcon size={32} color={colors.white} />
              </View>
              <Text style={styles.headerTitle}>Join as a 55+ Companion</Text>
              <Text style={styles.headerSubtitle}>
                Chat, share a few laughs, reduce loneliness for yourself and others
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
                placeholder="John Smith"
                value={form.fullName}
                onChangeText={(t: string) => setForm({ ...form, fullName: t })}
                autoCapitalize="words"
                error={errors.fullName}
              />

              {/* Date of Birth — 3 selectors */}
              <View style={styles.dobSection}>
                <Text style={styles.fieldLabel}>Date of Birth *</Text>
                <View style={styles.dobRow}>
                  {/* Month */}
                  <View style={styles.dobMonthWrap}>
                    <View style={styles.selectWrapper}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={form.dobMonth}
                          onChange={(e: any) =>
                            setForm({ ...form, dobMonth: parseInt(e.target.value) })
                          }
                          style={selectNativeStyle}
                        >
                          <option value={0}>Month</option>
                          {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Pressable
                          style={styles.selectFallback}
                          onPress={() => {
                            const next = form.dobMonth >= 12 ? 1 : form.dobMonth + 1;
                            setForm({ ...form, dobMonth: next });
                          }}
                        >
                          <Text style={styles.selectFallbackText}>
                            {form.dobMonth ? MONTHS[form.dobMonth - 1].label : 'Month'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Day */}
                  <View style={styles.dobDayWrap}>
                    <View style={styles.selectWrapper}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={form.dobDay}
                          onChange={(e: any) =>
                            setForm({ ...form, dobDay: parseInt(e.target.value) })
                          }
                          style={selectNativeStyle}
                        >
                          <option value={0}>Day</option>
                          {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Pressable
                          style={styles.selectFallback}
                          onPress={() => {
                            const next = form.dobDay >= maxDays ? 1 : form.dobDay + 1;
                            setForm({ ...form, dobDay: next });
                          }}
                        >
                          <Text style={styles.selectFallbackText}>
                            {form.dobDay || 'Day'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Year */}
                  <View style={styles.dobYearWrap}>
                    <View style={styles.selectWrapper}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={form.dobYear}
                          onChange={(e: any) =>
                            setForm({ ...form, dobYear: parseInt(e.target.value) })
                          }
                          style={selectNativeStyle}
                        >
                          <option value={0}>Year</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Pressable
                          style={styles.selectFallback}
                          onPress={() => {
                            const idx = YEARS.indexOf(form.dobYear);
                            const next = idx < 0 || idx >= YEARS.length - 1 ? YEARS[0] : YEARS[idx + 1];
                            setForm({ ...form, dobYear: next });
                          }}
                        >
                          <Text style={styles.selectFallbackText}>
                            {form.dobYear || 'Year'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
                {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
              </View>

              <Input
                label="Email *"
                placeholder="john@example.com"
                value={form.email}
                onChangeText={(t: string) => setForm({ ...form, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
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

// Native <select> inline style for web
const selectNativeStyle = {
  width: '100%',
  height: 44,
  fontSize: 15,
  border: '2px solid #D1D5DB',
  borderRadius: 8,
  backgroundColor: '#FFFFFF',
  paddingLeft: 10,
  paddingRight: 10,
  color: '#1F2937',
  outline: 'none',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2712%27%20height%3D%278%27%20viewBox%3D%270%200%2012%208%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201l5%205%205-5%27%20stroke%3D%27%236B7280%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '12px 8px',
  cursor: 'pointer',
};

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
    backgroundColor: COMPANION_COLOR,
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
  fieldLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  errorText: {
    ...typography.styles.caption,
    color: colors.error[500],
    marginTop: spacing[1],
  },

  // DOB selectors
  dobSection: {
    gap: spacing[1],
  },
  dobRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  dobMonthWrap: {
    flex: 1.2,
  },
  dobDayWrap: {
    flex: 0.8,
  },
  dobYearWrap: {
    flex: 1,
  },
  selectWrapper: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  selectFallback: {
    height: 44,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  selectFallbackText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },

  // Actions
  actions: {
    gap: spacing[3],
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: COMPANION_COLOR,
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
    backgroundColor: COMPANION_COLOR,
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
    backgroundColor: COMPANION_COLOR,
    marginBottom: spacing[3],
  },
  backLink: {
    ...typography.styles.body,
    color: colors.primary[500],
    fontWeight: '600',
    paddingVertical: spacing[2],
  },
});
