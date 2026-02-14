// HealthGuide Caregiver Pending Invitations Screen
// Shows care group invitations awaiting acceptance/decline

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius } from '@/theme/spacing';
import { ChevronLeftIcon, CheckIcon } from '@/components/icons';
import { Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Invitation {
  id: string;
  name: string;
  role: string;
  consent_status: string;
  consent_requested_at: string;
  is_active: boolean;
  care_group: {
    id: string;
    name: string;
    elder_id: string;
    elder: {
      first_name: string;
      last_name: string;
    };
    agency: {
      name: string;
    };
  };
}

export default function PendingInvitationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('care_group_members')
        .select(`
          id,
          name,
          role,
          consent_status,
          consent_requested_at,
          is_active,
          care_group:care_groups!inner (
            id,
            name,
            elder_id,
            elder:elders!inner (first_name, last_name),
            agency:agencies!inner (name)
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'caregiver')
        .eq('consent_status', 'pending')
        .eq('is_active', true);

      if (error) throw error;

      // Handle Supabase joins that return arrays
      const transformed = (data || []).map((item: any) => ({
        ...item,
        care_group: Array.isArray(item.care_group)
          ? item.care_group[0]
          : item.care_group,
      }));

      // Sort by most recent first
      transformed.sort(
        (a: Invitation, b: Invitation) =>
          new Date(b.consent_requested_at).getTime() -
          new Date(a.consent_requested_at).getTime()
      );

      setInvitations(transformed);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      Alert.alert('Error', 'Failed to load pending invitations');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleResponse = async (
    invitationId: string,
    response: 'accepted' | 'declined'
  ) => {
    if (!user?.id) return;

    setProcessingId(invitationId);

    try {
      const { error } = await supabase.functions.invoke(
        'respond-care-group-invite',
        {
          body: {
            member_id: invitationId,
            response,
            user_id: user.id,
          },
        }
      );

      if (error) throw error;

      // Remove from list with animation
      setInvitations(
        invitations.filter((inv) => inv.id !== invitationId)
      );

      // Show success message
      const action = response === 'accepted' ? 'accepted' : 'declined';
      const invitation = invitations.find((inv) => inv.id === invitationId);
      const groupName = invitation?.care_group.name || 'care group';

      Alert.alert(
        'Success',
        `You have ${action} the invitation to ${groupName}`
      );
    } catch (error) {
      console.error(`Error ${response}ing invitation:`, error);
      Alert.alert(
        'Error',
        `Failed to ${response === 'accepted' ? 'accept' : 'decline'} invitation`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineConfirm = (invitationId: string) => {
    const invitation = invitations.find((inv) => inv.id === invitationId);
    if (!invitation) return;

    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to care for ${invitation.care_group.elder.first_name} ${invitation.care_group.elder.last_name}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Decline',
          onPress: () => handleResponse(invitationId, 'declined'),
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeftIcon size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Pending Invitations</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ChevronLeftIcon size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Pending Invitations</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {invitations.length === 0 ? (
        <View style={styles.emptyState}>
          <CheckIcon size={64} color={colors.success[400]} />
          <Text style={styles.emptyTitle}>No pending invitations</Text>
          <Text style={styles.emptySubtitle}>
            All your care group invitations have been addressed
          </Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          renderItem={({ item }) => (
            <View style={styles.invitationCard}>
              {/* Agency Badge */}
              <Text style={styles.agencyName}>{item.care_group.agency.name}</Text>

              {/* Elder Name */}
              <Text style={styles.elderName}>
                Care for {item.care_group.elder.first_name}{' '}
                {item.care_group.elder.last_name}
              </Text>

              {/* Group Name */}
              <Text style={styles.groupName}>{item.care_group.name}</Text>

              {/* When Invited */}
              <Text style={styles.invitedTime}>
                Invited {formatDistanceToNow(new Date(item.consent_requested_at), { addSuffix: true })}
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Accept"
                  variant="primary"
                  size="caregiver"
                  onPress={() => handleResponse(item.id, 'accepted')}
                  loading={processingId === item.id}
                  disabled={processingId !== null}
                  style={styles.acceptButton}
                />
                <Button
                  title="Decline"
                  variant="secondary"
                  size="caregiver"
                  onPress={() => handleDeclineConfirm(item.id)}
                  loading={processingId === item.id}
                  disabled={processingId !== null}
                  style={styles.declineButton}
                />
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  invitationCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: roleColors.caregiver,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  agencyName: {
    ...typography.caregiver.label,
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  elderName: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  groupName: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing[3],
  },
  invitedTime: {
    ...typography.caregiver.label,
    color: colors.text.tertiary,
    fontSize: 13,
    marginBottom: spacing[4],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  emptyTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    fontSize: 18,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
