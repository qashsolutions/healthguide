// HealthGuide Caregiver Profile
// Simple profile for caregivers

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { PersonIcon, PhoneIcon, CalendarIcon, CheckIcon } from '@/components/icons';

export default function CaregiverProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profileStatus, setProfileStatus] = useState<{
    active: boolean;
    npiVerified: boolean;
  } | null>(null);

  // Fetch marketplace profile status on mount
  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const { data } = await supabase
          .from('caregiver_profiles')
          .select('is_active, npi_verified')
          .eq('user_id', user?.id)
          .single();

        if (data) {
          setProfileStatus({
            active: data.is_active ?? true,
            npiVerified: data.npi_verified ?? false,
          });
        }
      } catch (err) {
        console.error('Error fetching profile status:', err);
      }
    };

    if (user?.id) {
      fetchProfileStatus();
    }
  }, [user?.id]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  // Mock stats
  const stats = {
    totalVisits: 127,
    thisWeek: 8,
    rating: 4.9,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <PersonIcon size={64} color={roleColors.caregiver} />
          </View>
          <Text style={styles.name}>{user?.full_name || 'Caregiver'}</Text>
          <View style={styles.phoneRow}>
            <PhoneIcon size={20} color={colors.text.secondary} />
            <Text style={styles.phone}>{user?.phone || '+1 555-xxx-xxxx'}</Text>
          </View>
          <Badge label="Active Caregiver" variant="success" size="lg" />

          {/* Marketplace Status */}
          {profileStatus && (
            <Badge
              label={profileStatus.active ? 'Active on Marketplace' : 'Profile Inactive'}
              variant={profileStatus.active ? 'success' : 'default'}
              size="lg"
              style={styles.marketplaceStatusBadge}
            />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalVisits}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.thisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐ {stats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          {/* Marketplace Profile */}
          <Card
            variant="outlined"
            padding="lg"
            onPress={() => router.push('/(protected)/caregiver/my-profile')}
            style={styles.actionCard}
          >
            <PersonIcon size={32} color={roleColors.caregiver} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Edit Marketplace Profile</Text>
              <Text style={styles.actionSubtitle}>Update your skills, availability & credentials</Text>
            </View>
          </Card>

          <Card
            variant="outlined"
            padding="lg"
            onPress={() => {/* TODO: View schedule */}}
            style={styles.actionCard}
          >
            <CalendarIcon size={32} color={roleColors.caregiver} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>My Schedule</Text>
              <Text style={styles.actionSubtitle}>View all upcoming visits</Text>
            </View>
          </Card>

          <Card
            variant="outlined"
            padding="lg"
            onPress={() => {/* TODO: Visit history */}}
            style={styles.actionCard}
          >
            <CheckIcon size={32} color={colors.success[500]} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Visit History</Text>
              <Text style={styles.actionSubtitle}>Review completed visits</Text>
            </View>
          </Card>
        </View>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          variant="secondary"
          size="caregiver"
          fullWidth
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
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
    alignItems: 'center',
    paddingTop: spacing[8],
    marginBottom: spacing[6],
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  name: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  phone: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.neutral[200],
  },
  statValue: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 28,
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  section: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  actionSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  signOutButton: {
    marginTop: 'auto',
  },
  marketplaceStatusBadge: {
    marginTop: spacing[2],
  },
});
