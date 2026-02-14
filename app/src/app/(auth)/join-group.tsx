import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/lib/notifications';
import { cleanInviteCode } from '@/lib/invite';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { Button, Input, OTPInput, Card } from '@/components/ui';
import {
  CaregiverIcon,
  FamilyIcon,
  ElderIcon,
  CheckIcon,
  PhoneIcon,
  ArrowLeftIcon,
} from '@/components/icons';

type Role = 'caregiver' | 'family_member' | 'elder';
type StepType = 'enter-code' | 'group-info' | 'verify-otp' | 'success';

interface GroupInfo {
  group_id: string;
  group_name: string;
  elder_name: string;
  role: Role;
  phone_masked?: string;
}

const INVITE_CODE_LENGTH = 8;
const OTP_LENGTH = 6;

export default function JoinGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // State management
  const [currentStep, setCurrentStep] = useState<StepType>('enter-code');
  const [inviteCode, setInviteCode] = useState(
    params.invite ? cleanInviteCode(params.invite as string) : ''
  );
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Auto-fill invite code from URL params
  useEffect(() => {
    if (params.invite && !inviteCode) {
      const cleaned = cleanInviteCode(params.invite as string);
      setInviteCode(cleaned);
    }
  }, [params.invite]);

  // Get current user email for context
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getCurrentUser();
  }, []);

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'caregiver':
        return <CaregiverIcon size={32} color={roleColors.caregiver} />;
      case 'family_member':
        return <FamilyIcon size={32} color={roleColors.family} />;
      case 'elder':
        return <ElderIcon size={32} color={roleColors.careseeker} />;
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'caregiver':
        return colors.success[600];
      case 'family_member':
        return colors.info[600];
      case 'elder':
        return colors.warning[600];
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'caregiver':
        return 'Caregiver';
      case 'family_member':
        return 'Family Member';
      case 'elder':
        return 'Care Recipient';
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    return phoneNumber;
  };

  // Step 1: Validate invite code and get group info
  const handleValidateCode = async () => {
    if (!inviteCode || inviteCode.length !== INVITE_CODE_LENGTH) {
      setError('Please enter a valid 8-character invite code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'join-care-group',
        {
          body: {
            action: 'validate',
            invite_code: inviteCode.toUpperCase(),
          },
        }
      );

      if (invokeError) {
        setError(invokeError.message || 'Failed to validate invite code');
        return;
      }

      if (!data?.success) {
        setError(data?.error || 'Invalid invite code');
        return;
      }

      setGroupInfo({
        group_id: data.group_id,
        group_name: data.group_name,
        elder_name: data.elder_name,
        role: data.role as Role,
      });

      setCurrentStep('group-info');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Request OTP via phone
  const handleRequestOTP = async () => {
    if (!phone) {
      setError('Please enter a phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phone);

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (authError) {
        setError(authError.message || 'Failed to send OTP');
        return;
      }

      setCurrentStep('verify-otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP and join group
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== OTP_LENGTH) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    const formattedPhone = formatPhoneNumber(phone);

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid OTP code');
        return;
      }

      if (!authData?.user?.id) {
        setError('Failed to authenticate');
        return;
      }

      const { data: joinData, error: joinError } = await supabase.functions.invoke(
        'join-care-group',
        {
          body: {
            action: 'join',
            invite_code: inviteCode.toUpperCase(),
            user_id: authData.user.id,
            phone: formattedPhone,
          },
        }
      );

      if (joinError) {
        setError(joinError.message || 'Failed to join group');
        return;
      }

      if (!joinData?.success) {
        setError(joinData?.error || 'Failed to complete registration');
        return;
      }

      // Register for push notifications
      try {
        const notifRole = groupInfo?.role === 'family_member' ? 'family' : groupInfo?.role === 'caregiver' ? 'caregiver' : 'family';
        await registerForPushNotifications(authData.user.id, notifRole);
      } catch (notifError) {
        console.warn('Failed to register for push notifications:', notifError);
      }

      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to role-specific dashboard on success
  const handleNavigateToDashboard = () => {
    if (!groupInfo) return;

    const navigationMap: Record<Role, string> = {
      caregiver: '/(protected)/caregiver/(tabs)',
      family_member: '/(protected)/family/dashboard',
      elder: '/(protected)/careseeker/(tabs)',
    };

    const route = navigationMap[groupInfo.role];
    router.replace(route as any);
  };

  const handleGoBack = () => {
    if (currentStep === 'enter-code') {
      router.back();
    } else if (currentStep === 'group-info') {
      setCurrentStep('enter-code');
      setGroupInfo(null);
      setError('');
    } else if (currentStep === 'verify-otp') {
      setCurrentStep('group-info');
      setOtp('');
      setError('');
    }
  };

  const accentColor = groupInfo ? getRoleColor(groupInfo.role) : colors.primary[600];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing[5],
            paddingVertical: spacing[5],
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with back button */}
          {currentStep !== 'success' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing[8],
              }}
            >
              <TouchableOpacity onPress={handleGoBack} style={{ padding: spacing[2] }}>
                <ArrowLeftIcon size={24} color={colors.neutral[700]} />
              </TouchableOpacity>
              <Text
                style={{
                  ...typography.styles.h2,
                  color: colors.neutral[900],
                  marginLeft: spacing[3],
                  flex: 1,
                }}
              >
                Join Care Group
              </Text>
            </View>
          )}

          {/* Step Indicator */}
          {currentStep !== 'success' && (
            <View
              style={{
                flexDirection: 'row',
                marginBottom: spacing[8],
                gap: spacing[2],
              }}
            >
              {(['enter-code', 'group-info', 'verify-otp'] as const).map((step, index) => (
                <View
                  key={step}
                  style={{
                    flex: 1,
                    height: 4,
                    backgroundColor:
                      currentStep === step
                        ? accentColor
                        : ['enter-code', 'group-info', 'verify-otp'].indexOf(currentStep) > index
                        ? accentColor
                        : colors.neutral[200],
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
          )}

          {/* Step 1: Enter Code */}
          {currentStep === 'enter-code' && (
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.styles.body, color: colors.neutral[600], marginBottom: spacing[3] }}>
                Enter the 8-character invite code provided by your care group
              </Text>

              <Input
                placeholder="XXXXXXXX"
                value={inviteCode}
                onChangeText={(text: string) => {
                  setInviteCode(text.toUpperCase());
                  setError('');
                }}
                maxLength={INVITE_CODE_LENGTH}
                style={{
                  textAlign: 'center',
                  fontSize: 18,
                  letterSpacing: 2,
                }}
                editable={!loading}
              />

              {error ? (
                <View
                  style={{
                    backgroundColor: colors.error[50],
                    borderLeftColor: colors.error[600],
                    borderLeftWidth: 4,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: spacing[2],
                    marginTop: spacing[4],
                  }}
                >
                  <Text style={{ ...typography.styles.caption, color: colors.error[700] }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View style={{ flex: 1 }} />

              <Button
                title={loading ? 'Validating...' : 'Continue'}
                onPress={handleValidateCode}
                disabled={inviteCode.length !== INVITE_CODE_LENGTH || loading}
                loading={loading}
                style={{
                  backgroundColor: accentColor,
                }}
              />
            </View>
          )}

          {/* Step 2: Group Info + Phone */}
          {currentStep === 'group-info' && groupInfo && (
            <View style={{ flex: 1 }}>
              {/* Group Info Card */}
              <Card style={{ marginBottom: spacing[5] }}>
                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      backgroundColor: `${accentColor}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getRoleIcon(groupInfo.role)}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ ...typography.styles.label, color: colors.neutral[900] }}>
                      {groupInfo.group_name}
                    </Text>
                    <Text style={{ ...typography.styles.caption, color: colors.neutral[600], marginTop: spacing[1] }}>
                      {groupInfo.elder_name}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    borderTopColor: colors.neutral[200],
                    borderTopWidth: 1,
                    marginTop: spacing[3],
                    paddingTop: spacing[3],
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing[2],
                      paddingVertical: spacing[2],
                      backgroundColor: `${accentColor}10`,
                      borderRadius: spacing[2],
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: accentColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing[2],
                      }}
                    >
                      <Text style={{ ...typography.styles.caption, color: colors.neutral[50], fontWeight: '600' }}>
                        {getRoleLabel(groupInfo.role)[0]}
                      </Text>
                    </View>
                    <Text style={{ ...typography.styles.bodySmall, color: colors.neutral[800], flex: 1 }}>
                      {getRoleLabel(groupInfo.role)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Phone Number Input */}
              <Text style={{ ...typography.styles.label, color: colors.neutral[900], marginBottom: spacing[2] }}>
                Phone Number
              </Text>
              <Input
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChangeText={(text: string) => {
                  setPhone(text);
                  setError('');
                }}
                keyboardType="phone-pad"
                editable={!loading}
                leftIcon={<PhoneIcon size={20} color={colors.neutral[400]} />}
              />

              {error ? (
                <View
                  style={{
                    backgroundColor: colors.error[50],
                    borderLeftColor: colors.error[600],
                    borderLeftWidth: 4,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: spacing[2],
                    marginTop: spacing[4],
                  }}
                >
                  <Text style={{ ...typography.styles.caption, color: colors.error[700] }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Text style={{ ...typography.styles.caption, color: colors.neutral[500], marginTop: spacing[4] }}>
                We'll send a verification code to this number
              </Text>

              <View style={{ flex: 1 }} />

              <Button
                title={loading ? 'Sending Code...' : 'Send Verification Code'}
                onPress={handleRequestOTP}
                disabled={!phone || loading}
                loading={loading}
                style={{
                  backgroundColor: accentColor,
                }}
              />
            </View>
          )}

          {/* Step 3: Verify OTP */}
          {currentStep === 'verify-otp' && groupInfo && (
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.styles.body, color: colors.neutral[600], marginBottom: spacing[3] }}>
                Enter the 6-digit code sent to {phone}
              </Text>

              <OTPInput
                value={otp}
                onChange={(text: string) => {
                  setOtp(text);
                  setError('');
                }}
                length={OTP_LENGTH}
              />

              {error ? (
                <View
                  style={{
                    backgroundColor: colors.error[50],
                    borderLeftColor: colors.error[600],
                    borderLeftWidth: 4,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: spacing[2],
                    marginTop: spacing[4],
                  }}
                >
                  <Text style={{ ...typography.styles.caption, color: colors.error[700] }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity onPress={handleRequestOTP} disabled={loading}>
                <Text
                  style={{
                    ...typography.styles.bodySmall,
                    color: accentColor,
                    textDecorationLine: 'underline',
                    marginTop: spacing[4],
                  }}
                >
                  Didn't receive a code? Send again
                </Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <Button
                title={loading ? 'Verifying...' : 'Verify & Join Group'}
                onPress={handleVerifyOTP}
                disabled={otp.length !== OTP_LENGTH || loading}
                loading={loading}
                style={{
                  backgroundColor: accentColor,
                }}
              />
            </View>
          )}

          {/* Step 4: Success */}
          {currentStep === 'success' && groupInfo && (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: `${accentColor}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[8],
                }}
              >
                <CheckIcon size={48} color={accentColor} />
              </View>

              <Text
                style={{
                  ...typography.styles.h2,
                  color: colors.neutral[900],
                  marginBottom: spacing[3],
                  textAlign: 'center',
                }}
              >
                Welcome to {groupInfo.group_name}!
              </Text>

              <Text
                style={{
                  ...typography.styles.body,
                  color: colors.neutral[600],
                  textAlign: 'center',
                  marginBottom: spacing[8],
                }}
              >
                You've successfully joined as a {getRoleLabel(groupInfo.role).toLowerCase()}. Let's get you set up.
              </Text>

              <Card
                style={{
                  marginBottom: spacing[8],
                  backgroundColor: `${accentColor}10`,
                  borderLeftColor: accentColor,
                  borderLeftWidth: 4,
                }}
              >
                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: accentColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getRoleIcon(groupInfo.role)}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ ...typography.styles.label, color: colors.neutral[900] }}>
                      {groupInfo.group_name}
                    </Text>
                    <Text style={{ ...typography.styles.caption, color: colors.neutral[600], marginTop: spacing[1] }}>
                      {groupInfo.elder_name}
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={{ flex: 1 }} />

              <Button
                title="Go to Dashboard"
                onPress={handleNavigateToDashboard}
                fullWidth
                style={{
                  backgroundColor: accentColor,
                }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
