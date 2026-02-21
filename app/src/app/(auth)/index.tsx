// HealthGuide Welcome Screen
// Companionship pivot landing — 3 primary cards + 2 secondary links

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, createShadow, borderRadius } from '@/theme/spacing';
import {
  AgencyOwnerIcon,
  StudentIcon,
  CompanionIcon,
  HealthGuideLogo,
} from '@/components/icons';

function RoleCard({
  title,
  subtitle,
  icon,
  onPress,
  color,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.cardIcon, { backgroundColor: color }]}>
        {icon}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

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
          <Text style={styles.tagline}>Companionship that matters</Text>
        </View>

        {/* Primary Cards */}
        <View style={styles.cardsSection}>
          <RoleCard
            title="I'm a Student"
            subtitle="Nursing/health student earning experience"
            icon={<StudentIcon size={28} color={colors.white} />}
            color="#7C3AED"
            onPress={() => router.push('/(auth)/signup-student' as any)}
          />

          <RoleCard
            title="I'm a 55+ Companion"
            subtitle="Share your time & companionship"
            icon={<CompanionIcon size={28} color={colors.white} />}
            color={colors.success[600]}
            onPress={() => router.push('/(auth)/signup-companion' as any)}
          />

          <RoleCard
            title="I'm an Agency Owner"
            subtitle="Manage your companion team"
            icon={<AgencyOwnerIcon size={28} color={colors.white} />}
            color={colors.primary[600]}
            onPress={() => router.push('/(auth)/login')}
          />
        </View>

        {/* Secondary Links */}
        <View style={styles.secondaryLinks}>
          <Pressable onPress={() => router.push('/(auth)/join-group' as any)}>
            <Text style={styles.secondaryLink}>I need care</Text>
          </Pressable>
          <Text style={styles.linkDot}>{'\u00B7'}</Text>
          <Pressable onPress={() => router.push('/(auth)/join-group' as any)}>
            <Text style={styles.secondaryLink}>I'm a family member</Text>
          </Pressable>
        </View>

        {/* Sign In */}
        <Pressable
          style={styles.signInContainer}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </Pressable>

        {/* Footer - Privacy & Terms */}
        <View style={styles.legalFooter}>
          <Text
            style={styles.legalLink}
            onPress={() => router.push('/(auth)/privacy-policy' as any)}
          >
            Privacy Policy
          </Text>
          <Text style={styles.legalDivider}>{'\u2022'}</Text>
          <Text
            style={styles.legalLink}
            onPress={() => router.push('/(auth)/terms' as any)}
          >
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
    ...createShadow(6, 0.25, 12, 10, colors.primary[700]),
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: spacing[1],
    letterSpacing: -1,
  },
  tagline: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  cardsSection: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
    minHeight: 80,
    ...createShadow(2, 0.1, 8, 4, colors.neutral[900]),
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral[500],
  },
  secondaryLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  secondaryLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  linkDot: {
    fontSize: 16,
    color: colors.neutral[400],
  },
  signInContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
    paddingVertical: spacing[2],
  },
  signInText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  signInLink: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing[4],
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
