// HealthGuide Elder — My Visit Requests
// Shows pending, confirmed, and past requests
// Elder can cancel pending requests

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { CalendarIcon, ClockIcon, PersonIcon, StarIcon } from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { cancelVisit } from '@/lib/cancelVisit';
import { cancelRecurringSeries } from '@/lib/recurringVisits';
import { format } from 'date-fns';

const SLOT_LABELS: Record<string, string> = {
  '6am-8am': '6–8 AM', '8am-10am': '8–10 AM', '10am-12pm': '10 AM–12 PM',
  '12pm-2pm': '12–2 PM', '2pm-4pm': '2–4 PM', '4pm-6pm': '4–6 PM',
  '6pm-8pm': '6–8 PM', '8pm-10pm': '8–10 PM',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '\u23F3 Waiting for response', color: colors.warning[700], bg: colors.warning[50] },
  accepted: { label: '\u2705 Confirmed', color: colors.success[700], bg: colors.success[50] },
  declined: { label: '\u274C Declined', color: colors.error[700], bg: colors.error[50] },
  expired: { label: '\u23F0 Expired', color: colors.neutral[500], bg: colors.neutral[100] },
  cancelled: { label: 'Cancelled', color: colors.neutral[500], bg: colors.neutral[100] },
};

interface RequestItem {
  id: string;
  companion_id: string;
  requested_date: string;
  requested_time_slot: string;
  tasks: string[];
  note: string | null;
  status: string;
  created_at: string;
  companion_name?: string;
  visit_id?: string;
  visit_completed?: boolean;
  already_rated?: boolean;
  visit_is_recurring?: boolean;
  visit_parent_id?: string | null;
}

interface Section {
  title: string;
  data: RequestItem[];
}

export default function MyRequestsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get elder_id for user or via family_members
      let elderId: string | null = null;
      const { data: elderData } = await supabase
        .from('elders')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      elderId = elderData?.id || null;

      if (!elderId) {
        const { data: famData } = await supabase
          .from('family_members')
          .select('elder_id')
          .eq('user_id', user.id)
          .eq('invite_status', 'accepted')
          .maybeSingle();
        elderId = famData?.elder_id || null;
      }

      if (!elderId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('elder_id', elderId)
        .order('requested_date', { ascending: false });

      if (error) throw error;

      // Fetch companion names from user_profiles
      const companionIds = [...new Set((data || []).map((r) => r.companion_id))];
      let nameMap: Record<string, string> = {};
      if (companionIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', companionIds);
        (profiles || []).forEach((p) => {
          nameMap[p.id] = `${p.first_name} ${p.last_name?.[0] || ''}.`;
        });
      }

      let enriched: RequestItem[] = (data || []).map((r) => ({
        ...r,
        companion_name: nameMap[r.companion_id] || 'Companion',
      }));

      // For accepted requests, look up completed visits + existing ratings
      const acceptedRequests = enriched.filter((r) => r.status === 'accepted');
      if (acceptedRequests.length > 0 && elderId) {
        const { data: visits } = await supabase
          .from('visits')
          .select('id, caregiver_id, scheduled_date, status, is_recurring, parent_visit_id')
          .eq('elder_id', elderId)
          .in('caregiver_id', acceptedRequests.map((r) => r.companion_id));

        const { data: myRatings } = await supabase
          .from('visit_ratings')
          .select('visit_id')
          .eq('rated_by', user!.id);

        const ratedVisitIds = new Set((myRatings || []).map((r) => r.visit_id));

        enriched = enriched.map((r) => {
          if (r.status !== 'accepted') return r;
          const matchingVisit = (visits || []).find(
            (v) => v.caregiver_id === r.companion_id && v.scheduled_date === r.requested_date
          );
          if (matchingVisit) {
            return {
              ...r,
              visit_id: matchingVisit.id,
              visit_completed: matchingVisit.status === 'completed',
              already_rated: ratedVisitIds.has(matchingVisit.id),
              visit_is_recurring: matchingVisit.is_recurring,
              visit_parent_id: matchingVisit.parent_visit_id,
            };
          }
          return r;
        });
      }

      // Group into sections
      const pending = enriched.filter((r) => r.status === 'pending');
      const confirmed = enriched.filter((r) => r.status === 'accepted');
      const past = enriched.filter((r) => ['declined', 'expired', 'cancelled'].includes(r.status));

      const secs: Section[] = [];
      if (pending.length > 0) secs.push({ title: 'Pending', data: pending });
      if (confirmed.length > 0) secs.push({ title: 'Confirmed', data: confirmed });
      if (past.length > 0) secs.push({ title: 'Past', data: past });

      setSections(secs);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function onRefresh() {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }

  async function handleCancel(requestId: string) {
    const doCancel = async () => {
      try {
        await supabase
          .from('visit_requests')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', requestId);
        await loadRequests();
      } catch (err: any) {
        const msg = err.message || 'Could not cancel request';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this visit request?')) doCancel();
    } else {
      Alert.alert('Cancel Request', 'Are you sure you want to cancel this visit request?', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel Request', style: 'destructive', onPress: doCancel },
      ]);
    }
  }

  async function handleCancelVisit(visitId: string, isRecurring?: boolean, parentId?: string | null) {
    if (!user?.id) return;

    const isPartOfSeries = isRecurring || !!parentId;

    const doSingleCancel = async () => {
      const result = await cancelVisit(visitId, 'elder', user!.id);
      if (result.success) {
        Platform.OS === 'web' ? alert('Visit cancelled successfully.') : Alert.alert('Cancelled', 'Visit cancelled successfully.');
        await loadRequests();
      } else {
        const errMsg = result.error || 'Could not cancel visit';
        Platform.OS === 'web' ? alert(errMsg) : Alert.alert('Error', errMsg);
      }
    };

    const doCancelSeries = async () => {
      const seriesParentId = isRecurring ? visitId : parentId;
      if (!seriesParentId) return;
      const result = await cancelRecurringSeries(seriesParentId);
      if (result.success) {
        const msg = `Recurring series cancelled. ${result.cancelled} future visit${result.cancelled !== 1 ? 's' : ''} removed.`;
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Series Cancelled', msg);
        await loadRequests();
      } else {
        const errMsg = result.error || 'Could not cancel series';
        Platform.OS === 'web' ? alert(errMsg) : Alert.alert('Error', errMsg);
      }
    };

    if (isPartOfSeries) {
      if (Platform.OS === 'web') {
        const choice = window.prompt(
          'This is a recurring visit.\n\nType "1" to cancel this visit only\nType "2" to cancel all future visits',
          '1',
        );
        if (choice === '1') doSingleCancel();
        else if (choice === '2') doCancelSeries();
      } else {
        Alert.alert('Cancel Recurring Visit?', 'This is a recurring visit.', [
          { text: 'Keep', style: 'cancel' },
          { text: 'This Visit Only', onPress: doSingleCancel },
          { text: 'All Future Visits', style: 'destructive', onPress: doCancelSeries },
        ]);
      }
    } else {
      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to cancel this confirmed visit?')) doSingleCancel();
      } else {
        Alert.alert('Cancel Visit?', 'Are you sure you want to cancel this confirmed visit?', [
          { text: 'Keep Visit', style: 'cancel' },
          { text: 'Cancel Visit', style: 'destructive', onPress: doSingleCancel },
        ]);
      }
    }
  }

  function renderRequest({ item }: { item: RequestItem }) {
    const dateLabel = format(new Date(item.requested_date + 'T12:00:00'), 'EEE, MMM d');
    const slotLabel = SLOT_LABELS[item.requested_time_slot] || item.requested_time_slot;
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <Card style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.companionRow}>
            <View style={styles.companionAvatar}>
              <PersonIcon size={16} color={roleColors.caregiver} />
            </View>
            <Text style={styles.companionName}>{item.companion_name}</Text>
          </View>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>

        {/* Status badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
          {(item.visit_is_recurring || item.visit_parent_id) && (
            <View style={[styles.statusBadge, { backgroundColor: colors.neutral[100] }]}>
              <Text style={[styles.statusText, { color: colors.text.secondary }]}>
                {'\uD83D\uDD01'} Recurring
              </Text>
            </View>
          )}
        </View>

        {/* Time */}
        <Text style={styles.timeText}>{slotLabel}</Text>

        {/* Cancel button for pending */}
        {item.status === 'pending' && (
          <Pressable
            style={styles.cancelButton}
            onPress={() => handleCancel(item.id)}
          >
            <Text style={styles.cancelText}>Cancel Request</Text>
          </Pressable>
        )}

        {/* Cancel button for confirmed visits that haven't started */}
        {item.status === 'accepted' && !item.visit_completed && item.visit_id && (
          <Pressable
            style={styles.cancelButton}
            onPress={() => handleCancelVisit(item.visit_id!, item.visit_is_recurring, item.visit_parent_id)}
          >
            <Text style={styles.cancelText}>
              {(item.visit_is_recurring || item.visit_parent_id) ? 'Cancel Visit / Series' : 'Cancel Visit'}
            </Text>
          </Pressable>
        )}

        {/* Rate button for completed visits */}
        {item.visit_completed && !item.already_rated && item.visit_id && (
          <Pressable
            style={styles.rateButton}
            onPress={() => router.push(`/(protected)/careseeker/rate-visit?visitId=${item.visit_id}` as any)}
          >
            <StarIcon size={14} color={colors.warning[600]} />
            <Text style={styles.rateText}>Rate this visit</Text>
          </Pressable>
        )}
        {item.already_rated && (
          <Text style={styles.ratedText}>{'\u2B50'} Rated</Text>
        )}
      </Card>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'My Requests', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>
                {loading ? 'Loading...' : 'No requests yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Request a visit from the companion directory
              </Text>
              <Pressable
                style={styles.findButton}
                onPress={() => router.push('/(protected)/careseeker/find-companion' as any)}
              >
                <Text style={styles.findButtonText}>Find a Companion</Text>
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  sectionHeader: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },

  // Request card
  requestCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  companionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  dateText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginBottom: spacing[1],
  },
  statusText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  timeText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },
  cancelButton: {
    marginTop: spacing[2],
    paddingVertical: spacing[1],
  },
  cancelText: {
    ...typography.styles.bodySmall,
    color: colors.error[500],
    fontWeight: '600',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
    paddingVertical: spacing[1],
  },
  rateText: {
    ...typography.styles.bodySmall,
    color: colors.warning[600],
    fontWeight: '600',
  },
  ratedText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  findButton: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: roleColors.careseeker,
  },
  findButtonText: {
    ...typography.styles.body,
    color: colors.white,
    fontWeight: '600',
  },
});
