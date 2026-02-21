// HealthGuide Companion — Agencies Near Me
// Companion browses nearby agencies and applies to join
// Also shows linked agencies with option to leave

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input, Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import {
  SearchIcon,
  CloseIcon,
  LocationIcon,
  PersonIcon,
  CheckIcon,
} from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface AgencyItem {
  id: string;
  name: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  elder_count: number;
  caregiver_count: number;
  link_status: 'none' | 'pending' | 'linked';
  link_id?: string; // caregiver_agency_links.id for leave
}

export default function AgenciesNearMeScreen() {
  const { user } = useAuth();
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const loadAgencies = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get caregiver profile id
      const { data: profile } = await supabase
        .from('caregiver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Fetch all agencies
      const { data: agencyData, error } = await supabase
        .from('agencies')
        .select('id, name, city, state, zip_code, phone');

      if (error) throw error;

      // Get existing links for this caregiver
      const { data: links } = await supabase
        .from('caregiver_agency_links')
        .select('id, agency_id, status')
        .eq('caregiver_profile_id', profile.id)
        .eq('status', 'active');

      const linkMap: Record<string, string> = {};
      const linkIdMap: Record<string, string> = {};
      (links || []).forEach((l) => {
        linkMap[l.agency_id] = 'linked';
        linkIdMap[l.agency_id] = l.id;
      });

      // Get pending applications (companion_to_agency direction)
      const { data: invites } = await supabase
        .from('agency_invites')
        .select('agency_id, status')
        .eq('companion_id', user.id)
        .eq('direction', 'companion_to_agency')
        .eq('status', 'pending');

      (invites || []).forEach((inv) => {
        if (!linkMap[inv.agency_id]) {
          linkMap[inv.agency_id] = 'pending';
        }
      });

      // Get elder counts per agency
      const { data: elderCounts } = await supabase
        .from('elders')
        .select('agency_id')
        .eq('is_active', true);

      const elderCountMap: Record<string, number> = {};
      (elderCounts || []).forEach((e) => {
        if (e.agency_id) {
          elderCountMap[e.agency_id] = (elderCountMap[e.agency_id] || 0) + 1;
        }
      });

      // Get caregiver counts per agency
      const { data: cgCounts } = await supabase
        .from('caregiver_agency_links')
        .select('agency_id')
        .eq('status', 'active');

      const cgCountMap: Record<string, number> = {};
      (cgCounts || []).forEach((c) => {
        cgCountMap[c.agency_id] = (cgCountMap[c.agency_id] || 0) + 1;
      });

      const items: AgencyItem[] = (agencyData || []).map((a) => ({
        id: a.id,
        name: a.name || 'Agency',
        city: a.city || '',
        state: a.state || '',
        zip_code: a.zip_code || '',
        phone: a.phone,
        elder_count: elderCountMap[a.id] || 0,
        caregiver_count: cgCountMap[a.id] || 0,
        link_status: (linkMap[a.id] as any) || 'none',
        link_id: linkIdMap[a.id],
      }));

      setAgencies(items);
    } catch (err) {
      console.error('Error loading agencies:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  async function onRefresh() {
    setRefreshing(true);
    await loadAgencies();
    setRefreshing(false);
  }

  async function handleApply(agency: AgencyItem) {
    if (!user?.id || applyingId) return;
    setApplyingId(agency.id);

    try {
      const { data, error } = await supabase
        .from('agency_invites')
        .insert({
          agency_id: agency.id,
          companion_id: user.id,
          direction: 'companion_to_agency',
          status: 'pending',
          message: 'I would like to join your agency as a companion.',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const msg = 'You already have a pending application to this agency.';
          Platform.OS === 'web' ? alert(msg) : Alert.alert('Already Applied', msg);
        } else {
          throw error;
        }
        return;
      }

      // Update local state
      setAgencies((prev) =>
        prev.map((a) =>
          a.id === agency.id ? { ...a, link_status: 'pending' as const } : a
        )
      );

      // Notify agency owner (non-blocking)
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            agencyId: agency.id,
            title: 'New Companion Application',
            body: `A companion wants to join your agency`,
            data: { type: 'companion_application', inviteId: data.id },
          },
        });
      } catch {
        // Non-critical
      }
    } catch (err: any) {
      const msg = err.message || 'Could not send application';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setApplyingId(null);
    }
  }

  async function handleLeave(agency: AgencyItem) {
    if (!agency.link_id || leavingId) return;

    const doLeave = async () => {
      setLeavingId(agency.id);
      try {
        await supabase
          .from('caregiver_agency_links')
          .update({ status: 'inactive' })
          .eq('id', agency.link_id!);

        setAgencies((prev) =>
          prev.map((a) =>
            a.id === agency.id ? { ...a, link_status: 'none' as const, link_id: undefined } : a
          )
        );
      } catch (err: any) {
        const msg = err.message || 'Could not leave agency';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      } finally {
        setLeavingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Leave ${agency.name}? You can re-apply later.`)) doLeave();
    } else {
      Alert.alert('Leave Agency', `Leave ${agency.name}? You can re-apply later.`, [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: doLeave },
      ]);
    }
  }

  const filtered = useMemo(() => {
    if (!searchText.trim()) return agencies;
    const lower = searchText.trim().toLowerCase();
    if (/^\d{1,5}$/.test(searchText.trim())) {
      return agencies.filter((a) => a.zip_code.startsWith(searchText.trim()));
    }
    return agencies.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.city.toLowerCase().includes(lower)
    );
  }, [agencies, searchText]);

  // Split into linked and available
  const myAgencies = filtered.filter((a) => a.link_status === 'linked');
  const available = filtered.filter((a) => a.link_status !== 'linked');

  function renderAgencyCard({ item }: { item: AgencyItem }) {
    const isApplying = applyingId === item.id;
    const isLeaving = leavingId === item.id;

    return (
      <Card style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.cardIcon}>
            <Text style={styles.agencyEmoji}>{'\uD83C\uDFE2'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.agencyName}>{item.name}</Text>
            <View style={styles.locationRow}>
              <LocationIcon size={12} color={colors.text.tertiary} />
              <Text style={styles.locationText}>
                {item.city}{item.state ? `, ${item.state}` : ''} {item.zip_code}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>{item.elder_count} elders</Text>
              <Text style={styles.statDot}>{'\u00B7'}</Text>
              <Text style={styles.statText}>{item.caregiver_count} caregivers</Text>
            </View>

            {/* Action based on status */}
            <View style={styles.actionRow}>
              {item.link_status === 'linked' ? (
                <View style={styles.linkedRow}>
                  <View style={styles.linkedBadge}>
                    <CheckIcon size={12} color={colors.success[700]} />
                    <Text style={styles.linkedText}>Linked</Text>
                  </View>
                  <Pressable
                    onPress={() => handleLeave(item)}
                    disabled={isLeaving}
                    style={styles.leaveButton}
                  >
                    <Text style={styles.leaveText}>{isLeaving ? 'Leaving...' : 'Leave'}</Text>
                  </Pressable>
                </View>
              ) : item.link_status === 'pending' ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>{'\u23F3'} Application Pending</Text>
                </View>
              ) : (
                <Button
                  title="Apply to Join"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleApply(item)}
                  loading={isApplying}
                  disabled={isApplying}
                />
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Agencies Near Me', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchRow}>
          <Input
            placeholder="Search agency name, city, or zip..."
            value={searchText}
            onChangeText={setSearchText}
            leftIcon={<SearchIcon size={20} color={colors.neutral[400]} />}
            rightIcon={searchText ? <CloseIcon size={18} color={colors.neutral[400]} /> : undefined}
            onRightIconPress={() => setSearchText('')}
          />
        </View>

        <FlatList
          data={[...myAgencies, ...available]}
          keyExtractor={(item) => item.id}
          renderItem={renderAgencyCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            myAgencies.length > 0 ? (
              <Text style={styles.sectionHeader}>My Agencies</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <PersonIcon size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>
                {loading ? 'Loading agencies...' : 'No agencies found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Agencies in your area will appear here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  listContent: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
  sectionHeader: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },

  // Card
  card: { padding: 0 },
  cardBody: { flexDirection: 'row', padding: spacing[3], gap: spacing[3] },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: roleColors.agency_owner + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyEmoji: { fontSize: 24 },
  cardInfo: { flex: 1 },
  agencyName: { ...typography.styles.body, color: colors.text.primary, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { ...typography.styles.caption, color: colors.text.tertiary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] },
  statText: { ...typography.styles.caption, color: colors.text.secondary },
  statDot: { color: colors.text.tertiary, fontSize: 10 },

  // Actions
  actionRow: { marginTop: spacing[2] },
  linkedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  linkedText: { ...typography.styles.caption, color: colors.success[700], fontWeight: '600' },
  leaveButton: { paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  leaveText: { ...typography.styles.caption, color: colors.error[500], fontWeight: '600' },
  pendingBadge: {
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  pendingText: { ...typography.styles.caption, color: colors.warning[700], fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: spacing[10], gap: spacing[3] },
  emptyTitle: { ...typography.styles.body, color: colors.text.tertiary },
  emptySubtitle: { ...typography.styles.bodySmall, color: colors.text.tertiary, textAlign: 'center' },
});
