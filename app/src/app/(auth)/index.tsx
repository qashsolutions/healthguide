// HealthGuide Welcome Screen
// Role selection for login flow - vertical 3-option layout
// Per frontend-design skill - professional SVG icons, not emojis

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import {
  AgencyOwnerIcon,
  CaregiverIcon,
  HealthGuideLogo,
} from '@/components/icons';

// Role card component for vertical layout
function RoleCard({
  title,
  description,
  icon,
  onPress,
  color
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.roleCard,
        { borderColor: color },
        pressed && styles.roleCardPressed
      ]}
      onPress={onPress}
    >
      <View style={[styles.roleIconContainer, { backgroundColor: color }]}>
        {icon}
      </View>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  const openPrivacyPolicy = () => {
    router.push('/(auth)/privacy-policy');
  };

  const openTermsConditions = () => {
    router.push('/(auth)/terms');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <HealthGuideLogo size={48} color={colors.white} />
          </View>
          <Text style={styles.title}>HealthGuide</Text>
          <Text style={styles.subtitle}>Professional Elder Care Management</Text>
        </View>

        {/* Role Selection - Vertical 3-Option Layout */}
        <View style={styles.roleSection}>
          <Text style={styles.sectionTitle}>I am a...</Text>

          {/* Agency Owner Card */}
          <RoleCard
            title="Agency Owner"
            description="Manage your care agency"
            icon={<AgencyOwnerIcon size={28} color={colors.white} />}
            color={colors.primary[600]}
            onPress={() => router.push('/(auth)/login')}
          />

          {/* Link below Agency Owner */}
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={styles.contextLinkContainer}
          >
            <Text style={styles.contextLink}>New agency? Register here</Text>
          </Pressable>

          {/* Caregiver Card */}
          <RoleCard
            title="Caregiver"
            description="Sign up to offer care services"
            icon={<CaregiverIcon size={28} color={colors.white} />}
            color={colors.success[600]}
            onPress={() => router.push('/(auth)/caregiver-signup')}
          />

          {/* Link below Caregiver */}
          <Pressable
            onPress={() => router.push('/(auth)/phone-login?role=caregiver')}
            style={styles.contextLinkContainer}
          >
            <Text style={styles.contextLink}>Already registered? Sign in</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Invite Code Button */}
          <Pressable
            style={({ pressed }) => [
              styles.inviteButton,
              pressed && styles.inviteButtonPressed
            ]}
            onPress={() => router.push('/(auth)/join-group')}
          >
            <Text style={styles.inviteButtonText}>I have an invite code</Text>
          </Pressable>

          {/* Subtitle below invite button */}
          <Text style={styles.inviteSubtitle}>
            Join as family member or elder
          </Text>
        </View>

        {/* Footer - Privacy & Terms */}
        <View style={styles.legalFooter}>
          <Text style={styles.legalLink} onPress={openPrivacyPolicy}>
            Privacy Policy
          </Text>
          <Text style={styles.legalDivider}>•</Text>
          <Text style={styles.legalLink} onPress={openTermsConditions}>
            Terms & Conditions
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: spacing[1],
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  roleSection: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[4],
    textAlign: 'center',
    fontWeight: '600',
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[2],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roleCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  roleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  roleTitle: {
    ...typography.styles.bodyLarge,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  roleDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  contextLinkContainer: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[2],
  },
  contextLink: {
    ...typography.styles.body,
    color: colors.primary[600],
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[6],
  },
  inviteButton: {
    width: '100%',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  inviteButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  inviteButtonText: {
    ...typography.styles.bodyLarge,
    color: colors.primary[600],
    fontWeight: '700',
    textAlign: 'center',
  },
  inviteSubtitle: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing[4],
    marginTop: spacing[6],
  },
  legalLink: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  legalDivider: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginHorizontal: spacing[2],
  },
});
