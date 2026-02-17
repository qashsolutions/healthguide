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
import { QRInviteCard } from '@/components/ui/QRCode';
import { shareInvite, refreshInviteCode, buildDeepLink } from '@/lib/invite';
import { Badge, Button } from '@/components/ui';
import { TrashIcon, PersonIcon } from '@/components/icons';

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
    first_name?: string;
    last_name?: string;
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
          care_group_members(id, care_group_id, caregiver_id, role, status, consent_status, created_at, caregiver:user_profiles(id, first_name, last_name)),
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

    const name = careGroup.elder
      ? `${careGroup.elder.first_name} ${careGroup.elder.last_name}`
      : 'Unknown';

    try {
      await shareInvite({
        inviteCode: careGroup.invite_code,
        elderName: name,
      });
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
              const result = await refreshInviteCode(careGroup.id);
              setCareGroup({
                ...careGroup,
                invite_code: result.invite_code,
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
    async (memberId: string, memberName?: string) => {
      if (!careGroup) return;

      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${memberName || 'this member'} from the care group?`,
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
          <ActivityIndicator size="large" color={colors.primary[500]} />
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
            elderName={elderName}
            deepLink={buildDeepLink(careGroup.invite_code)}
            onShare={handleShareInvite}
            onRefresh={handleRefreshCode}
          />
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
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberCardRow}>
                    <View style={styles.memberAvatar}>
                      <PersonIcon size={20} color={colors.primary[500]} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.caregiver?.first_name ? `${member.caregiver.first_name} ${member.caregiver.last_name || ''}`.trim() : 'Unknown'}
                      </Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveMember(member.id, member.caregiver?.first_name ? `${member.caregiver.first_name} ${member.caregiver.last_name || ''}`.trim() : undefined)}>
                      <TrashIcon size={20} color={colors.error[500]} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {pendingMembers.length > 0 && (
            <View style={styles.memberSubsection}>
              <Text style={styles.memberSubtitle}>Awaiting Acceptance</Text>
              {pendingMembers.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberCardRow}>
                    <View style={styles.memberAvatar}>
                      <PersonIcon size={20} color={colors.primary[500]} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.caregiver?.first_name ? `${member.caregiver.first_name} ${member.caregiver.last_name || ''}`.trim() : 'Unknown'}
                      </Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveMember(member.id, member.caregiver?.first_name ? `${member.caregiver.first_name} ${member.caregiver.last_name || ''}`.trim() : undefined)}>
                      <TrashIcon size={20} color={colors.error[500]} />
                    </Pressable>
                  </View>
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
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberCardRow}>
                    <View style={styles.memberAvatar}>
                      <PersonIcon size={20} color={colors.neutral[400]} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.caregiver?.first_name ? `${member.caregiver.first_name} ${member.caregiver.last_name || ''}`.trim() : 'Unknown'}
                      </Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveMember(member.id, member.caregiver?.first_name ? `${member.caregiver.first_name} ${member.caregiver.last_name || ''}`.trim() : undefined)}>
                      <TrashIcon size={20} color={colors.error[500]} />
                    </Pressable>
                  </View>
                  <View style={styles.declinedContainer}>
                    <Badge label="Declined" variant="error" size="sm" />
                    <Button
                      title="Invite Another Caregiver"
                      onPress={() =>
                        router.push({
                          pathname: '/(protected)/agency/elder/care-group-edit' as any,
                          params: { groupId: careGroup.id },
                        } as any)
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
    paddingBottom: spacing[8],
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  elderName: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  groupName: {
    ...typography.styles.h1,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  description: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  section: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  memberSubsection: {
    marginBottom: spacing[5],
  },
  memberSubtitle: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  memberRole: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  emptyState: {
    paddingVertical: spacing[5],
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  infoLabel: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.styles.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[2],
  },
  button: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: 8,
    marginTop: spacing[3],
  },
  buttonText: {
    ...typography.styles.bodySmall,
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    ...typography.styles.bodySmall,
    color: colors.error[500],
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing[5],
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing[2],
    marginLeft: spacing[14],
  },
  declinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
    marginLeft: spacing[14],
  },
  inviteButton: {
    flex: 1,
  },
});
