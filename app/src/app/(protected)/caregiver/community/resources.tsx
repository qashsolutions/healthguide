// HealthGuide Caregiver Resources
// Static list of caregiver resource links grouped by category

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Card } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ChevronRightIcon } from '@/components/icons';

interface Resource {
  title: string;
  description: string;
  url: string;
}

interface ResourceCategory {
  name: string;
  emoji: string;
  resources: Resource[];
}

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    name: 'Training',
    emoji: '📖',
    resources: [
      {
        title: 'CMS EVV Requirements',
        description: 'Electronic Visit Verification compliance guide',
        url: 'https://www.medicaid.gov/medicaid/home-community-based-services/guidance/electronic-visit-verification-evv/index.html',
      },
      {
        title: 'Caregiver Training Resources',
        description: 'Free online training modules from PHI',
        url: 'https://www.phinational.org/',
      },
      {
        title: 'First Aid & CPR Certification',
        description: 'American Red Cross certification courses',
        url: 'https://www.redcross.org/take-a-class',
      },
    ],
  },
  {
    name: 'Wellness',
    emoji: '💚',
    resources: [
      {
        title: 'Caregiver Burnout Prevention',
        description: 'Signs, symptoms, and strategies for self-care',
        url: 'https://www.caregiver.org/resource/caregiver-burnout/',
      },
      {
        title: 'Mental Health Support',
        description: 'SAMHSA National Helpline (1-800-662-4357)',
        url: 'https://www.samhsa.gov/find-help/national-helpline',
      },
      {
        title: 'Stress Management Techniques',
        description: 'Mindfulness and relaxation strategies for caregivers',
        url: 'https://www.nia.nih.gov/health/caregiving/caregiver-health',
      },
    ],
  },
  {
    name: 'Legal',
    emoji: '⚖️',
    resources: [
      {
        title: 'Caregiver Rights & Protections',
        description: 'Know your workplace rights as a caregiver',
        url: 'https://www.dol.gov/agencies/whd',
      },
      {
        title: 'HIPAA for Caregivers',
        description: 'Understanding patient privacy requirements',
        url: 'https://www.hhs.gov/hipaa/index.html',
      },
    ],
  },
  {
    name: 'Benefits',
    emoji: '🏥',
    resources: [
      {
        title: 'Healthcare.gov',
        description: 'Health insurance marketplace enrollment',
        url: 'https://www.healthcare.gov/',
      },
      {
        title: 'Caregiver Support Programs',
        description: 'State and federal assistance programs',
        url: 'https://eldercare.acl.gov/',
      },
      {
        title: 'Financial Assistance',
        description: 'Benefits.gov - find government benefits',
        url: 'https://www.benefits.gov/',
      },
    ],
  },
];

export default function ResourcesScreen() {
  function openResource(url: string) {
    Linking.openURL(url).catch((err) =>
      console.error('Error opening URL:', err)
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Resources',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {RESOURCE_CATEGORIES.map((category) => (
          <View key={category.name} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{category.emoji}</Text>
              <Text style={styles.sectionTitle}>{category.name}</Text>
            </View>

            <Card variant="outlined" padding="none">
              {category.resources.map((resource, index) => (
                <Pressable
                  key={resource.title}
                  style={[
                    styles.resourceRow,
                    index < category.resources.length - 1 && styles.resourceRowBorder,
                  ]}
                  onPress={() => openResource(resource.url)}
                >
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <Text style={styles.resourceDesc} numberOfLines={1}>
                      {resource.description}
                    </Text>
                  </View>
                  <ChevronRightIcon size={18} color={colors.neutral[400]} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
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
  section: {
    marginBottom: spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  resourceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  resourceInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  resourceTitle: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  resourceDesc: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
});
