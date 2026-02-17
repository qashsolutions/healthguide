// HealthGuide Elder Home Screen
// Per healthguide-careseeker/onboarding skill - Extra large touch targets

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius, shadows } from '@/theme/spacing';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PhoneIcon, HeartIcon, PersonIcon, WaveIcon } from '@/components/icons';

export default function ElderHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <GradientHeader roleColor={roleColors.careseeker}>
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.full_name?.split(' ')[0] || 'there'}!</Text>
          </View>
        </GradientHeader>

        {/* Large Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Call Family - Primary Action */}
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              styles.callButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(protected)/careseeker/(tabs)/calls')}
          >
            <PhoneIcon size={64} color={colors.white} />
            <Text style={styles.bigButtonText}>Call Family</Text>
          </Pressable>

          {/* Activities */}
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              styles.activitiesButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(protected)/careseeker/(tabs)/activities')}
          >
            <HeartIcon size={64} color={colors.white} />
            <Text style={styles.bigButtonText}>Activities</Text>
          </Pressable>

          {/* Daily Check-in */}
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              styles.checkinButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(protected)/careseeker/daily-check-in')}
          >
            <WaveIcon size={48} color={colors.white} />
            <Text style={styles.bigButtonText}>How are you?</Text>
          </Pressable>
        </View>

        {/* Next Caregiver Visit */}
        <View style={styles.nextVisit}>
          <View style={styles.visitIcon}>
            <PersonIcon size={32} color={roleColors.caregiver} />
          </View>
          <View style={styles.visitInfo}>
            <Text style={styles.visitLabel}>Next Visit</Text>
            <Text style={styles.visitTime}>Maria at 10:30 AM</Text>
          </View>
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
    padding: spacing[6],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing[8],
  },
  greeting: {
    ...typography.elder.body,
    color: colors.text.secondary,
  },
  name: {
    ...typography.elder.heading,
    color: colors.text.primary,
  },
  buttonsContainer: {
    gap: spacing[4],
    paddingVertical: spacing[8],
  },
  bigButton: {
    height: touchTargets.elder + 20, // Extra large: 116px
    borderRadius: borderRadius['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    ...shadows.lg,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  callButton: {
    backgroundColor: colors.success[500],
  },
  activitiesButton: {
    backgroundColor: roleColors.careseeker,
  },
  checkinButton: {
    backgroundColor: colors.warning[500],
  },
  bigButtonText: {
    ...typography.elder.button,
    color: colors.white,
  },
  nextVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[4],
  },
  visitIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitInfo: {
    flex: 1,
  },
  visitLabel: {
    ...typography.elder.body,
    color: colors.text.secondary,
    fontSize: 18,
  },
  visitTime: {
    ...typography.elder.heading,
    color: colors.text.primary,
    fontSize: 24,
  },
});
