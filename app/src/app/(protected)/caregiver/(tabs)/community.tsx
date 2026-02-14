// HealthGuide Caregiver Community/Support
// Per healthguide-community/caregiver-support skill

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CommunityIcon, HeartIcon, PersonIcon } from '@/components/icons';

// Mock data
const mockGroups = [
  {
    id: '1',
    name: 'New Caregiver Support',
    members: 24,
    lastActive: '2 min ago',
    description: 'A safe space for caregivers in their first year',
  },
  {
    id: '2',
    name: 'Self-Care Corner',
    members: 156,
    lastActive: '5 min ago',
    description: 'Share tips for maintaining your own wellness',
  },
  {
    id: '3',
    name: 'Dementia Care',
    members: 89,
    lastActive: '1 hr ago',
    description: 'Support and strategies for dementia caregiving',
  },
];

const mockWellnessPrompt = {
  title: 'Daily Check-in',
  question: 'How are you feeling today?',
  options: ['😊 Great', '😐 Okay', '😔 Struggling'],
};

export default function CaregiverCommunityScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>Connect with fellow caregivers</Text>
        </View>

        {/* Wellness Check-in Card */}
        <Card variant="elevated" padding="lg" style={styles.wellnessCard}>
          <View style={styles.wellnessHeader}>
            <HeartIcon size={28} color={colors.error[500]} />
            <Text style={styles.wellnessTitle}>{mockWellnessPrompt.title}</Text>
          </View>
          <Text style={styles.wellnessQuestion}>{mockWellnessPrompt.question}</Text>
          <View style={styles.moodOptions}>
            {mockWellnessPrompt.options.map((option, index) => (
              <Button
                key={index}
                title={option}
                variant="secondary"
                size="lg"
                onPress={() => router.push('/(protected)/caregiver/community/wellness')}
                style={styles.moodButton}
              />
            ))}
          </View>
        </Card>

        {/* Support Groups */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Support Groups</Text>
            <Button
              title="Browse All"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(protected)/caregiver/community/groups')}
            />
          </View>

          {mockGroups.map((group) => (
            <Card
              key={group.id}
              variant="default"
              padding="md"
              onPress={() => router.push(`/(protected)/caregiver/community/groups/${group.id}`)}
              style={styles.groupCard}
            >
              <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                  <CommunityIcon size={24} color={roleColors.caregiver} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {group.members} members • Active {group.lastActive}
                  </Text>
                </View>
              </View>
              <Text style={styles.groupDescription}>{group.description}</Text>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Card
              variant="outlined"
              padding="md"
              onPress={() => router.push('/(protected)/caregiver/community/groups')}
              style={styles.actionCard}
            >
              <Text style={styles.actionEmoji}>💬</Text>
              <Text style={styles.actionText}>Chat with Peer</Text>
            </Card>
            <Card
              variant="outlined"
              padding="md"
              onPress={() => router.push('/(protected)/caregiver/community/resources')}
              style={styles.actionCard}
            >
              <Text style={styles.actionEmoji}>📚</Text>
              <Text style={styles.actionText}>Resources</Text>
            </Card>
            <Card
              variant="outlined"
              padding="md"
              onPress={() => Linking.openURL('tel:988')}
              style={styles.actionCard}
            >
              <Text style={styles.actionEmoji}>🆘</Text>
              <Text style={styles.actionText}>Get Help Now</Text>
            </Card>
            <Card
              variant="outlined"
              padding="md"
              onPress={() => router.push('/(protected)/caregiver/community/journal')}
              style={styles.actionCard}
            >
              <Text style={styles.actionEmoji}>📝</Text>
              <Text style={styles.actionText}>Journal</Text>
            </Card>
          </View>
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
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    paddingTop: spacing[4],
    marginBottom: spacing[6],
  },
  title: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontSize: 16,
  },
  wellnessCard: {
    marginBottom: spacing[6],
    backgroundColor: colors.error[50],
    borderColor: colors.error[200],
    borderWidth: 1,
  },
  wellnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  wellnessTitle: {
    ...typography.caregiver.label,
    color: colors.error[700],
  },
  wellnessQuestion: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  moodOptions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  moodButton: {
    flex: 1,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
  },
  groupCard: {
    marginBottom: spacing[3],
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  groupMeta: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  groupDescription: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  actionCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing[5],
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: spacing[2],
  },
  actionText: {
    ...typography.styles.label,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
