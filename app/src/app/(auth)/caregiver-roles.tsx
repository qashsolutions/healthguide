// HealthGuide Caregiver Role Picker
// Screen 2b: Student, 55+ Companion, or Agency Owner

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
  ArrowLeftIcon,
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

export default function CaregiverRolesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeftIcon size={24} color={colors.neutral[700]} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join as a Caregiver</Text>
          <Text style={styles.subtitle}>Choose your role to get started</Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsSection}>
          <RoleCard
            title="I'm a Student"
            subtitle="Nursing/health student earning clinical experience"
            icon={<StudentIcon size={28} color={colors.white} />}
            color="#7C3AED"
            onPress={() => router.push('/(auth)/signup-student' as any)}
          />

          <RoleCard
            title="I'm a 55+ Companion"
            subtitle="Chat, share a few laughs, reduce loneliness for yourself and others"
            icon={<CompanionIcon size={28} color={colors.white} />}
            color={colors.success[600]}
            onPress={() => router.push('/(auth)/signup-companion' as any)}
          />

          <RoleCard
            title="I'm an Agency Owner"
            subtitle="Manage your caregiver agency"
            icon={<AgencyOwnerIcon size={28} color={colors.white} />}
            color={colors.primary[600]}
            onPress={() => router.push('/(auth)/login')}
          />
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
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[4],
    alignSelf: 'flex-start',
    paddingVertical: spacing[1],
  },
  backText: {
    ...typography.styles.body,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: spacing[1],
    letterSpacing: -0.5,
  },
  subtitle: {
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
});
