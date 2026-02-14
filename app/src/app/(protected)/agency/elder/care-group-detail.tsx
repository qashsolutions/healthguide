import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { CareGroupCard } from '@/components/agency/CareGroupCard';
import { QRInviteCard } from '@/components/ui/QRCode';
import { shareInvite, refreshInviteCode } from '@/lib/invite';
import { Badge, Button } from '@/components/ui';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface CareGroupMember {
  id: string;
  care_group_id: string;
  caregiver_id: string;
  role: string;
  status: 'accepted' | 'pending';
  consent_status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  caregiver?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface CareGroup {
  id: string;
  agency_id: string;
  elder_id: string;
  name: string;
  description?: string;
  invite_code: string;
  invite_code_expires_at?: string;
  created_at: string;
  updated_at: string;
  care_group_members: CareGroupMember[];
  elder?: {
    first_name: string;
    last_name: string;
  };
  agency?: {
    name: string;
  };
}

export default function CareGroupDetailScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [careGroup, setCareGroup] = useState<CareGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch care group details
  const fetchCareGroup = useCallback(async () => {
    if (!groupId) {
      setError('No care group ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('care_groups')
        .select(
          `
          *,
          care_group_members(id, care_group_id, caregiver_id, role, status, consent_status, created_at, caregiver:users(id, email, full_name)),
          elder:elders(first_name, last_name),
          agency:agencies(name)
        `
        )
        .eq('id', groupId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Care group not found');
      }

      setCareGroup(data as CareGroup);
    } catch (err) {
      console.error('Error fetching care group:', err);
      setError(err instanceof Error ? err.message : 'Failed to load care group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchCareGroup();
  }, [fetchCareGroup]);

  // Handle share invite
  const handleShareInvite = useCallback(async () => {
    if (!careGroup) return;

    try {
      await shareInvite(careGroup.invite_code, careGroup.name);
    } catch (err) {
      Alert.alert('Error', 'Failed to share invite code');
      console.error('Error sharing invite:', err);
    }
  }, [careGroup]);

  // Handle refresh invite code
  const handleRefreshCode = useCallback(async () => {
    if (!careGroup) return;

    Alert.alert(
      'Refresh Invite Code',
      'Creating a new invite code will invalidate the old one. Continue?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Refresh',
          onPress: async () => {
            try {
              setRefreshing(true);
              const newCode = await refreshInviteCode(careGroup.id);
              setCareGroup({
                ...careGroup,
                invite_code: newCode,
              });
              Alert.alert('Success', 'Invite code refreshed');
            } catch (err) {
              Alert.alert('Error', 'Failed to refresh invite code');
              console.error('Error refreshing code:', err);
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  }, [careGroup]);

  // Handle remove member
  const handleRemoveMember = useCallback(
    async (memberId: string, memberEmail?: string) => {
      if (!careGroup) return;

      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${memberEmail || 'this member'} from the care group?`,
        [
          { text: 'Cancel', onPress: () => {} },
          {
            text: 'Remove',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('care_group_members')
                  .delete()
                  .eq('id', memberId);

                if (error) throw error;

                // Update local state
                setCareGroup({
                  ...careGroup,
                  care_group_members: careGroup.care_group_members.filter(
                    (m) => m.id !== memberId
                  ),
                });

                Alert.alert('Success', 'Member removed from care group');
              } catch (err) {
                Alert.alert('Error', 'Failed to remove member');
                console.error('Error removing member:', err);
              }
            },
            style: 'destructive',
          },
        ]
      );
    },
    [careGroup]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !careGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error || 'Care group not found'}</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const elderName = careGroup.elder
    ? `${careGroup.elder.first_name} ${careGroup.elder.last_name}`
    : 'Unknown';

  const acceptedMembers = careGroup.care_group_members.filter(
    (m) => m.consent_status === 'accepted'
  );
  const pendingMembers = careGroup.care_group_members.filter(
    (m) => m.consent_status === 'pending'
  );
  const declinedMembers = careGroup.care_group_members.filter(
    (m) => m.consent_status === 'declined'
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.elderName}>{elderName}</Text>
          <Text style={styles.groupName}>{careGroup.name}</Text>
          {careGroup.description && (
            <Text style={styles.description}>{careGroup.description}</Text>
          )}
        </View>

        {/* QR Invite Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Team Members</Text>
          <QRInviteCard
            inviteCode={careGroup.invite_code}
            groupName={careGroup.name}
          />

          <View style={styles.actionButtonsContainer}>
            <Pressable
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleShareInvite}
              disabled={refreshing}
            >
              <Text style={styles.actionButtonText}>Share Invite</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleRefreshCode}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Refresh Code</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Team Members ({careGroup.care_group_members.length})
          </Text>

          {acceptedMembers.length > 0 && (
            <View style={styles.memberSubsection}>
              <Text style={styles.memberSubtitle}>Active Members</Text>
              {acceptedMembers.map((member) => (
                <CareGroupCard
                  key={member.id}
                  member={member}
                  onRemove={() =>
                    handleRemoveMember(member.id, member.caregiver?.email)
                  }
                />
              ))}
            </View>
          )}

          {pendingMembers.length > 0 && (
            <View style={styles.memberSubsection}>
              <Text style={styles.memberSubtitle}>Awaiting Acceptance</Text>
              {pendingMembers.map((member) => (
                <View key={member.id}>
                  <CareGroupCard
                    member={member}
                    onRemove={() =>
                      handleRemoveMember(member.id, member.caregiver?.email)
                    }
                  />
                  <View style={styles.badgeRow}>
                    <Badge label="Awaiting acceptance" variant="warning" size="sm" />
                  </View>
                </View>
              ))}
            </View>
          )}

          {declinedMembers.length > 0 && (
            <View style={styles.memberSubsection}>
              <Text style={styles.memberSubtitle}>Declined</Text>
              {declinedMembers.map((member) => (
                <View key={member.id}>
                  <CareGroupCard
                    member={member}
                    onRemove={() =>
                      handleRemoveMember(member.id, member.caregiver?.email)
                    }
                  />
                  <View style={styles.declinedContainer}>
                    <Badge label="Declined" variant="error" size="sm" />
                    <Button
                      label="Invite Another Caregiver"
                      onPress={() =>
                        router.push({
                          pathname: '/(protected)/agency/elder/care-group-edit',
                          params: { groupId: careGroup.id },
                        })
                      }
                      variant="secondary"
                      size="sm"
                      style={styles.inviteButton}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {careGroup.care_group_members.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No team members yet. Share the invite code above to add caregivers.
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Group ID</Text>
              <Text style={styles.infoValue}>{careGroup.id.substring(0, 8)}...</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agency</Text>
              <Text style={styles.infoValue}>{careGroup.agency?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {new Date(careGroup.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Spacing at bottom */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  elderName: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  groupName: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  memberSubsection: {
    marginBottom: spacing.lg,
  },
  memberSubtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  declinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  inviteButton: {
    flex: 1,
  },
});
