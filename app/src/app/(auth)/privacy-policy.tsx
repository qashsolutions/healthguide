// HealthGuide Privacy Policy Screen
// Placeholder legal text for app store submission

import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy Policy',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: February 13, 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          HealthGuide collects information you provide when creating an account, including your name, email address, phone number, and role (agency owner, caregiver, or family member). For caregivers, we may also collect professional credentials, certifications, and availability. For electronic visit verification (EVV) compliance, we collect location data during visit check-in and check-out.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information to provide and improve the HealthGuide platform, including scheduling visits, facilitating communication between caregivers and families, generating care reports, and ensuring EVV compliance. We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.sectionTitle}>3. Data Storage and Security</Text>
        <Text style={styles.body}>
          Your data is stored securely using industry-standard encryption. We use Supabase for data storage with row-level security policies to ensure users can only access data they are authorized to view. All data transmissions are encrypted using TLS.
        </Text>

        <Text style={styles.sectionTitle}>4. Location Data</Text>
        <Text style={styles.body}>
          HealthGuide collects GPS location data only during active visit check-in and check-out for EVV compliance purposes. Location data is not collected in the background or outside of visit workflows. You may revoke location permissions at any time through your device settings.
        </Text>

        <Text style={styles.sectionTitle}>5. Push Notifications</Text>
        <Text style={styles.body}>
          With your consent, we send push notifications for visit reminders, schedule changes, and care updates. You can manage notification preferences in the app settings or through your device settings.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.body}>
          We retain your personal data for as long as your account is active or as needed to provide services. Visit records and care documentation are retained in accordance with applicable healthcare record-keeping requirements. You may request deletion of your account and associated data by contacting support.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to access, correct, or delete your personal information. You may also request a copy of your data in a portable format. To exercise these rights, contact us at support@healthguide.app.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this Privacy Policy, please contact us at support@healthguide.app.
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
