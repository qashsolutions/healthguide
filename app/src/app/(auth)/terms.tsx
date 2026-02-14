// HealthGuide Terms & Conditions Screen
// Placeholder legal text for app store submission

import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Terms & Conditions',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Terms & Conditions</Text>
        <Text style={styles.updated}>Last updated: February 13, 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By accessing or using the HealthGuide application, you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use the application.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.body}>
          HealthGuide is a care management platform that connects home care agencies, caregivers, elders, and their families. The platform provides visit scheduling, electronic visit verification (EVV), task management, care reporting, and communication tools.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.body}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account and keep it up to date.
        </Text>

        <Text style={styles.sectionTitle}>4. Agency Owner Responsibilities</Text>
        <Text style={styles.body}>
          Agency owners are responsible for ensuring their agency complies with all applicable healthcare regulations, licensing requirements, and labor laws. HealthGuide provides tools to assist with compliance but does not guarantee regulatory compliance.
        </Text>

        <Text style={styles.sectionTitle}>5. Caregiver Responsibilities</Text>
        <Text style={styles.body}>
          Caregivers must maintain valid certifications and credentials as required by their agency and applicable regulations. Caregivers agree to accurately record visit times, complete assigned tasks, and report any concerns about elder welfare.
        </Text>

        <Text style={styles.sectionTitle}>6. Billing and Payments</Text>
        <Text style={styles.body}>
          Agency owners agree to pay subscription fees as outlined in their selected plan. Fees are billed monthly based on the number of active elders. Failure to maintain payment may result in service suspension.
        </Text>

        <Text style={styles.sectionTitle}>7. Data and Privacy</Text>
        <Text style={styles.body}>
          Your use of HealthGuide is also governed by our Privacy Policy. By using the application, you consent to the collection and use of information as described in the Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
        <Text style={styles.body}>
          HealthGuide is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of the platform, including but not limited to direct, indirect, incidental, or consequential damages. HealthGuide is not a substitute for professional medical advice or emergency services.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        <Text style={styles.body}>
          We reserve the right to suspend or terminate your account if you violate these terms or engage in conduct that we determine to be harmful to other users or the platform. You may terminate your account at any time by contacting support.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact</Text>
        <Text style={styles.body}>
          For questions about these Terms & Conditions, please contact us at support@healthguide.app.
        </Text>
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
  heading: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  updated: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  body: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
