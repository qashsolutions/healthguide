// HealthGuide Elder Activities Screen
// Per healthguide-community/elder-engagement skill

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius, shadows } from '@/theme/spacing';
import { BrainIcon, HelpIcon, MusicIcon, CameraIcon, IconProps } from '@/components/icons';

const activities: { id: string; Icon: React.ComponentType<IconProps>; title: string; color: string }[] = [
  { id: 'memory', Icon: BrainIcon, title: 'Memory Game', color: colors.primary[500] },
  { id: 'trivia', Icon: HelpIcon, title: 'Trivia', color: colors.warning[500] },
  { id: 'music', Icon: MusicIcon, title: 'Music', color: colors.error[400] },
  { id: 'photos', Icon: CameraIcon, title: 'Photos', color: roleColors.careseeker },
];

export default function ElderActivitiesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.title}>Activities</Text>
        <Text style={styles.subtitle}>Choose something fun!</Text>

        {/* Activity Grid */}
        <View style={styles.grid}>
          {activities.map((activity) => {
            const ActivityIcon = activity.Icon;
            return (
              <Pressable
                key={activity.id}
                style={({ pressed }) => [
                  styles.activityButton,
                  { backgroundColor: activity.color },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.push(`/(protected)/careseeker/games/${activity.id}` as any)}
              >
                <ActivityIcon size={64} color={colors.white} />
                <Text style={styles.activityTitle}>{activity.title}</Text>
              </Pressable>
            );
          })}
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
    padding: spacing[6],
  },
  title: {
    ...typography.elder.heading,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[6],
  },
  subtitle: {
    ...typography.elder.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'center',
  },
  activityButton: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  activityTitle: {
    ...typography.elder.button,
    color: colors.white,
    fontSize: 22,
  },
});
