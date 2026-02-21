// HealthGuide Companion — Visit Requests
// View and respond to pending visit requests from elders/families
// Accept creates a visit record; decline notifies the elder

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { CalendarIcon, ClockIcon, PersonIcon, CheckIcon, CloseIcon } from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { format } from 'date-fns';

const TASK_LABELS: Record<string, string> = {
  companionship: '\uD83D\uDCAC Companionship',
  light_cleaning: '\uD83E\uDDF9 Light Cleaning',
  groceries: '\uD83D\uDED2 Groceries & Errands',
};

const SLOT_LABELS: Record<string, string> = {
  '6am-8am': '6–8 AM', '8am-10am': '8–10 AM', '10am-12pm': '10 AM–12 PM',
  '12pm-2pm': '12–2 PM', '2pm-4pm': '2–4 PM', '4pm-6pm': '4–6 PM',
  '6pm-8pm': '6–8 PM', '8pm-10pm': '8–10 PM',
};

const SLOT_TIMES: Record<string, { start: string; end: string }> = {
  '6am-8am': { start: '06:00', end: '08:00' },
  '8am-10am': { start: '08:00', end: '10:00' },
  '10am-12pm': { start: '10:00', end: '12:00' },
  '12pm-2pm': { start: '12:00', end: '14:00' },
  '2pm-4pm': { start: '14:00', end: '16:00' },
  '4pm-6pm': { start: '16:00', end: '18:00' },
  '6pm-8pm': { start: '18:00', end: '20:00' },
  '8pm-10pm': { start: '20:00', end: '22:00' },
};

interface VisitRequest {
  id: string;
  elder_id: string;
  companion_id: string;
  requested_by: string;
  requested_date: string;
  requested_time_slot: string;
  tasks: string[];
  note: string | null;
  status: string;
  is_auto_match: boolean;
  created_at: string;
  elder_name?: string;
  elder_zip?: string;
}

export default function CompanionRequestsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('companion_id', user.id)
        .eq('status', 'pending')
        .order('requested_date', { ascending: true });

      if (error) throw error;

      // Fetch elder names
      const elderIds = [...new Set((data || []).map((r) => r.elder_id))];
      let elderMap: Record<string, { name: string; zip: string }> = {};
      if (elderIds.length > 0) {
        const { data: elders } = await supabase
          .from('elders')
          .select('id, first_name, last_name, zip_code')
          .in('id', elderIds);

        (elders || []).forEach((e) => {
          elderMap[e.id] = {
            name: `${e.first_name} ${e.last_name}`,
            zip: e.zip_code || '',
          };
        });
      }

      const enriched: VisitRequest[] = (data || []).map((r) => ({
        ...r,
        elder_name: elderMap[r.elder_id]?.name || 'Unknown Elder',
        elder_zip: elderMap[r.elder_id]?.zip || '',
      }));

      setRequests(enriched);
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

  async function handleAccept(request: VisitRequest) {
    if (processingId) return;
    setProcessingId(request.id);

    try {
      // 1. Update request status
      await supabase
        .from('visit_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      // 2. Parse time slot
      const slotTimes = SLOT_TIMES[request.requested_time_slot];
      if (!slotTimes) throw new Error('Invalid time slot');

      const scheduledStart = `${request.requested_date}T${slotTimes.start}:00`;
      const scheduledEnd = `${request.requested_date}T${slotTimes.end}:00`;

      // 3. Check if companion is linked to an agency
      let agencyId: string | null = null;
      const { data: agencyLink } = await supabase
        .from('caregiver_agency_links')
        .select('agency_id')
        .eq('caregiver_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();
      if (agencyLink) agencyId = agencyLink.agency_id;

      // 4. Create visit record
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          elder_id: request.elder_id,
          caregiver_id: user!.id,
          agency_id: agencyId,
          scheduled_date: request.requested_date,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          status: 'scheduled',
          notes: request.note,
        })
        .select()
        .single();

      if (visitError) throw visitError;

      // 5. Create visit_tasks from task_library
      if (request.tasks && request.tasks.length > 0 && visit) {
        // Get task_library entries — try agency-specific first, then generic
        const { data: taskLib } = await supabase
          .from('task_library')
          .select('id, name, category')
          .eq('is_active', true);

        const TASK_CATEGORY_MAP: Record<string, string> = {
          companionship: 'companionship',
          light_cleaning: 'housekeeping',
          groceries: 'errands',
        };

        for (const taskKey of request.tasks) {
          const category = TASK_CATEGORY_MAP[taskKey];
          const libTask = taskLib?.find((t) => t.category === category);
          if (libTask) {
            await supabase.from('visit_tasks').insert({
              visit_id: visit.id,
              task_id: libTask.id,
              status: 'pending',
            });
          }
        }
      }

      // 6. Notify elder (non-blocking)
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: request.requested_by,
            title: 'Visit Confirmed!',
            body: `Your visit request for ${format(new Date(request.requested_date + 'T12:00:00'), 'MMM d')} has been accepted`,
            data: { type: 'visit_confirmed', visitId: visit?.id },
          },
        });
      } catch {
        // Non-critical
      }

      // Remove from local list
      setRequests((prev) => prev.filter((r) => r.id !== request.id));

      // Navigate to recurring setup (companion can skip if they want one-time)
      const slotLabel = SLOT_LABELS[request.requested_time_slot] || request.requested_time_slot;
      const taskLabels = (request.tasks || []).map((t) => TASK_LABELS[t]?.replace(/^[^\s]+\s/, '') || t).join(', ');
      router.push({
        pathname: '/(protected)/caregiver/recurring-setup' as any,
        params: {
          visitId: visit!.id,
          elderName: request.elder_name || '',
          visitDate: request.requested_date,
          visitTime: slotLabel,
          visitTasks: taskLabels,
        },
      });
    } catch (err: any) {
      const msg = err.message || 'Could not accept request';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDecline(request: VisitRequest) {
    if (processingId) return;

    const doDecline = async () => {
      setProcessingId(request.id);
      try {
        await supabase
          .from('visit_requests')
          .update({ status: 'declined', updated_at: new Date().toISOString() })
          .eq('id', request.id);

        // Notify elder
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              userId: request.requested_by,
              title: 'Request Declined',
              body: 'Your visit request was declined. You can find another companion.',
              data: { type: 'request_declined', requestId: request.id },
            },
          });
        } catch {
          // Non-critical
        }

        setRequests((prev) => prev.filter((r) => r.id !== request.id));
      } catch (err: any) {
        const msg = err.message || 'Could not decline request';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setProcessingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Decline this visit request?')) doDecline();
    } else {
      Alert.alert('Decline Request', 'Are you sure you want to decline this visit request?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: doDecline },
      ]);
    }
  }

  function renderRequest({ item }: { item: VisitRequest }) {
    const isProcessing = processingId === item.id;
    const dateLabel = format(new Date(item.requested_date + 'T12:00:00'), 'EEE, MMM d, yyyy');
    const slotLabel = SLOT_LABELS[item.requested_time_slot] || item.requested_time_slot;

    return (
      <Card style={styles.requestCard}>
        {/* Elder name */}
        <View style={styles.elderRow}>
          <View style={styles.elderAvatar}>
            <PersonIcon size={20} color={roleColors.careseeker} />
          </View>
          <Text style={styles.elderName}>{item.elder_name}</Text>
        </View>

        {/* Date + time */}
        <View style={styles.detailRow}>
          <CalendarIcon size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{dateLabel}</Text>
        </View>
        <View style={styles.detailRow}>
          <ClockIcon size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{slotLabel}</Text>
        </View>

        {/* Tasks */}
        <View style={styles.taskList}>
          {(item.tasks || []).map((t) => (
            <Text key={t} style={styles.taskPill}>
              {TASK_LABELS[t] || t}
            </Text>
          ))}
        </View>

        {/* Note */}
        {item.note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{'\uD83D\uDCDD'} "{item.note}"</Text>
          </View>
        )}

        {/* Zip */}
        {item.elder_zip && (
          <Text style={styles.zipText}>{'\uD83D\uDCCD'} ZIP {item.elder_zip}</Text>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.declineButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleDecline(item)}
            disabled={isProcessing}
          >
            <CloseIcon size={16} color={colors.error[600]} />
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
          <Button
            title="Accept"
            onPress={() => handleAccept(item)}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.acceptButton}
          />
        </View>
      </Card>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Visit Requests', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            requests.length > 0 ? (
              <Text style={styles.headerCount}>
                {requests.length} pending request{requests.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CheckIcon size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>
                {loading ? 'Loading requests...' : 'No pending requests'}
              </Text>
              <Text style={styles.emptySubtitle}>
                New requests from elders will appear here
              </Text>
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
    gap: spacing[3],
  },
  headerCount: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing[2],
  },

  // Request card
  requestCard: {
    padding: spacing[4],
  },
  elderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  elderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: roleColors.careseeker + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  elderName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 17,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  detailText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  taskList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  taskPill: {
    ...typography.styles.caption,
    color: colors.text.primary,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  noteBox: {
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.md,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  noteText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  zipText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginBottom: spacing[3],
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing[3],
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5] || 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error[200],
    backgroundColor: colors.error[50],
  },
  declineText: {
    ...typography.styles.body,
    color: colors.error[600],
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
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
  },
});
