// HealthGuide Agency Settings
// Per healthguide-agency/payments skill

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert, Platform, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { SettingsIcon, PersonIcon, ArrowLeftIcon } from '@/components/icons';

export default function SettingsScreen() {
  const { user, agency, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await signOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await signOut();
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Card variant="default" padding="lg" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <PersonIcon size={40} color={roleColors.agency_owner} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name || 'Agency Owner'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Badge label="Agency Owner" variant="info" size="sm" />
            </View>
          </View>
        </Card>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <Card variant="outlined" padding="md">
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Status</Text>
              <Badge
                label={agency?.subscription_status || 'Trial'}
                variant={agency?.subscription_status === 'active' ? 'success' : 'warning'}
              />
            </View>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Plan</Text>
              <Text style={styles.subscriptionValue}>$15/elder/month</Text>
            </View>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Caregivers</Text>
              <Text style={styles.subscriptionValue}>Up to 15</Text>
            </View>
            <Button
              title="Manage Subscription"
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => router.push('/(protected)/agency/settings/billing')}
              style={styles.subscriptionButton}
            />
          </Card>
        </View>

        {/* Agency Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agency Settings</Text>
          <Card variant="outlined" padding="none">
            <SettingsRow
              title="Agency Name"
              value={agency?.name || 'Your Agency'}
              onPress={() => router.push('/(protected)/agency/settings/' as any)}
            />
            <SettingsRow
              title="Task Library"
              value="Manage tasks"
              onPress={() => router.push('/(protected)/agency/settings/task-library')}
            />
            <SettingsRow
              title="EVV Reports"
              value="View & export"
              onPress={() => router.push('/(protected)/agency/evv-report' as any)}
            />
            <SettingsRow
              title="Billing"
              value="Manage subscription"
              onPress={() => router.push('/(protected)/agency/settings/billing')}
            />
            <SettingsRow
              title="SMS Notifications"
              value="Enabled"
              onPress={() => {}}
              isLast
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Card variant="outlined" padding="none">
            <SettingsRow
              title="Help Center"
              onPress={() => Linking.openURL('https://healthguide.app/help')}
            />
            <SettingsRow
              title="Contact Support"
              onPress={() => Linking.openURL('mailto:support@healthguide.app')}
            />
            <SettingsRow
              title="Privacy Policy"
              onPress={() => router.push('/(auth)/privacy-policy' as any)}
              isLast
            />
          </Card>
        </View>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          variant="danger"
          size="lg"
          fullWidth
          onPress={handleSignOut}
          style={styles.signOutButton}
        />

        {/* Version */}
        <Text style={styles.version}>HealthGuide v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  title,
  value,
  onPress,
  isLast = false,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.settingsRow,
        !isLast && styles.settingsRowBorder,
      ]}
    >
      <Text style={styles.settingsRowTitle}>{title}</Text>
      <View style={styles.settingsRowRight}>
        {value && <Text style={styles.settingsRowValue}>{value}</Text>}
        <ArrowLeftIcon size={20} color={colors.neutral[400]} />
      </View>
    </Pressable>
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
  profileCard: {
    marginBottom: spacing[6],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: roleColors.agency_owner + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  profileInfo: {
    flex: 1,
    gap: spacing[1],
  },
  profileName: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  profileEmail: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  subscriptionLabel: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  subscriptionValue: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  subscriptionButton: {
    marginTop: spacing[4],
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  settingsRowTitle: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  settingsRowValue: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  signOutButton: {
    marginTop: spacing[4],
  },
  version: {
    ...typography.styles.caption,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing[4],
  },
});
