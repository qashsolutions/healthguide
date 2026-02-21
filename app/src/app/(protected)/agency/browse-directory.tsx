// HealthGuide Agency — Browse Companion Directory
// Agency owner browses independent companions and invites them to join the agency
// Reuses filtering patterns from careseeker/find-companion but with "Invite" action

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input, Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import {
  SearchIcon,
  FilterIcon,
  CloseIcon,
  CompanionIcon,
  StudentIcon,
  PersonIcon,
} from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ALLOWED_TASKS } from '@/constants/tasks';

interface DirectoryCompanion {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  selfie_url: string | null;
  caregiver_type: 'student' | 'companion_55' | 'professional';
  zip_code: string;
  capabilities: string[];
  availability: Record<string, string[]> | null;
  languages: string[];
  bio: string | null;
  has_transportation: boolean;
  gender: string;
  college_name?: string;
  invite_status: 'none' | 'pending' | 'accepted';
}

const DAYS_SHORT = [
  { key: 'monday', label: 'Mon' }, { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' }, { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' }, { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const TASK_ICONS: Record<string, string> = {
  companionship: '\uD83D\uDCAC',
  light_cleaning: '\uD83E\uDDF9',
  groceries: '\uD83D\uDED2',
};

function summarizeAvailability(avail: Record<string, string[]> | null): string {
  if (!avail) return 'Not specified';
  const days = Object.keys(avail).filter((d) => (avail[d] || []).length > 0);
  if (days.length === 0) return 'Not specified';
  const labels = days.map((d) => DAYS_SHORT.find((ds) => ds.key === d)?.label || d);
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`;
}

export default function BrowseDirectoryScreen() {
  const { user } = useAuth();
  const [companions, setCompanions] = useState<DirectoryCompanion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [taskFilter, setTaskFilter] = useState<string[]>([]);
  const [transportFilter, setTransportFilter] = useState(false);

  const hasActiveFilters = typeFilter !== '' || taskFilter.length > 0 || transportFilter;

  const loadCompanions = useCallback(async () => {
    if (!user?.agency_id) return;

    try {
      // Fetch all active independent companions
      const { data: profiles, error } = await supabase
        .from('caregiver_profiles')
        .select(`
          id, user_id, full_name, caregiver_type, zip_code,
          capabilities, availability, languages, bio, gender,
          has_transportation, college_name, photo_url, selfie_url
        `)
        .in('caregiver_type', ['student', 'companion_55'])
        .eq('is_active', true)
        .eq('profile_completed', true);

      if (error) throw error;

      // Fetch existing invites from this agency
      const { data: invites } = await supabase
        .from('agency_invites')
        .select('companion_id, status')
        .eq('agency_id', user.agency_id)
        .eq('direction', 'agency_to_companion')
        .in('status', ['pending', 'accepted']);

      const inviteMap: Record<string, string> = {};
      (invites || []).forEach((inv) => {
        inviteMap[inv.companion_id] = inv.status;
      });

      // Also check already-linked via caregiver_agency_links
      const { data: links } = await supabase
        .from('caregiver_agency_links')
        .select('caregiver_profile_id')
        .eq('agency_id', user.agency_id)
        .eq('status', 'active');

      const linkedProfileIds = new Set((links || []).map((l) => l.caregiver_profile_id));

      const cards: DirectoryCompanion[] = (profiles || []).map((p) => {
        let inviteStatus: 'none' | 'pending' | 'accepted' = 'none';
        if (linkedProfileIds.has(p.id)) inviteStatus = 'accepted';
        else if (inviteMap[p.user_id] === 'pending') inviteStatus = 'pending';
        else if (inviteMap[p.user_id] === 'accepted') inviteStatus = 'accepted';

        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name || 'Unknown',
          photo_url: p.photo_url,
          selfie_url: p.selfie_url,
          caregiver_type: p.caregiver_type,
          zip_code: p.zip_code || '',
          capabilities: p.capabilities || [],
          availability: p.availability,
          languages: p.languages || [],
          bio: p.bio,
          has_transportation: p.has_transportation || false,
          gender: p.gender || '',
          college_name: p.college_name,
          invite_status: inviteStatus,
        };
      });

      setCompanions(cards);
    } catch (err) {
      console.error('Error loading directory:', err);
    }
    setLoading(false);
  }, [user?.agency_id]);

  useEffect(() => {
    loadCompanions();
  }, [loadCompanions]);

  async function onRefresh() {
    setRefreshing(true);
    await loadCompanions();
    setRefreshing(false);
  }

  async function handleInvite(companion: DirectoryCompanion) {
    if (!user?.agency_id || invitingId) return;
    setInvitingId(companion.id);

    try {
      const { data, error } = await supabase
        .from('agency_invites')
        .insert({
          agency_id: user.agency_id,
          companion_id: companion.user_id,
          direction: 'agency_to_companion',
          status: 'pending',
          message: `Your agency would like you to join their companion team.`,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique violation — already pending
          const msg = 'An invite is already pending for this companion.';
          Platform.OS === 'web' ? alert(msg) : Alert.alert('Already Invited', msg);
        } else {
          throw error;
        }
        return;
      }

      // Update local state
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === companion.id ? { ...c, invite_status: 'pending' as const } : c
        )
      );

      // Send notification (non-blocking)
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: companion.user_id,
            title: 'Agency Invitation',
            body: 'An agency wants you to join their team',
            data: { type: 'agency_invite', inviteId: data.id },
          },
        });
      } catch {
        // Non-critical
      }
    } catch (err: any) {
      const msg = err.message || 'Could not send invite';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setInvitingId(null);
    }
  }

  function clearFilters() {
    setTypeFilter('');
    setTaskFilter([]);
    setTransportFilter(false);
  }

  const filtered = useMemo(() => {
    let result = [...companions];

    // Text search
    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase();
      if (/^\d{1,5}$/.test(searchText.trim())) {
        result = result.filter((c) => c.zip_code?.startsWith(searchText.trim()));
      } else {
        result = result.filter((c) => c.full_name.toLowerCase().includes(lower));
      }
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((c) => c.caregiver_type === typeFilter);
    }

    // Task filter
    if (taskFilter.length > 0) {
      result = result.filter((c) =>
        taskFilter.every((t) => c.capabilities?.includes(t))
      );
    }

    // Transportation
    if (transportFilter) {
      result = result.filter((c) => c.has_transportation);
    }

    // Sort: un-invited first, then alphabetical
    result.sort((a, b) => {
      if (a.invite_status === 'none' && b.invite_status !== 'none') return -1;
      if (a.invite_status !== 'none' && b.invite_status === 'none') return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    return result;
  }, [companions, searchText, typeFilter, taskFilter, transportFilter]);

  function renderCard({ item }: { item: DirectoryCompanion }) {
    const displayName = item.full_name.split(' ')[0] + (item.full_name.split(' ')[1] ? ` ${item.full_name.split(' ')[1][0]}.` : '');
    const photo = item.selfie_url || item.photo_url;
    const isStudent = item.caregiver_type === 'student';
    const isInviting = invitingId === item.id;

    return (
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.cardPhotoImg} />
            ) : (
              <View style={styles.cardPhotoPlaceholder}>
                <PersonIcon size={24} color={colors.neutral[400]} />
              </View>
            )}
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{displayName}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, isStudent ? styles.studentBadge : styles.companionBadge]}>
                {isStudent ? <StudentIcon size={10} color={colors.white} /> : <CompanionIcon size={10} color={colors.white} />}
                <Text style={styles.typeBadgeText}>
                  {isStudent ? 'Student' : '55+'}
                </Text>
              </View>
              {item.zip_code && <Text style={styles.zipText}>ZIP {item.zip_code}</Text>}
            </View>

            <View style={styles.taskRow}>
              {(item.capabilities || []).map((cap) => (
                <Text key={cap} style={styles.taskEmoji}>{TASK_ICONS[cap] || '\u2022'}</Text>
              ))}
              {item.has_transportation && <Text style={styles.taskEmoji}>{'\uD83D\uDE97'}</Text>}
            </View>

            <Text style={styles.availText}>{summarizeAvailability(item.availability)}</Text>

            {/* Invite action */}
            <View style={styles.inviteRow}>
              {item.invite_status === 'accepted' ? (
                <View style={styles.linkedBadge}>
                  <Text style={styles.linkedText}>{'\u2705'} Linked</Text>
                </View>
              ) : item.invite_status === 'pending' ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>{'\u23F3'} Invite Pending</Text>
                </View>
              ) : (
                <Button
                  title="Invite to Agency"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleInvite(item)}
                  loading={isInviting}
                  disabled={isInviting}
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
      <Stack.Screen options={{ title: 'Browse Companion Directory', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchRow}>
          <Input
            placeholder="Search name or zip code..."
            value={searchText}
            onChangeText={setSearchText}
            leftIcon={<SearchIcon size={20} color={colors.neutral[400]} />}
            rightIcon={searchText ? <CloseIcon size={18} color={colors.neutral[400]} /> : undefined}
            onRightIconPress={() => setSearchText('')}
          />
        </View>

        {/* Filter bar */}
        <View style={styles.filterBar}>
          <Pressable
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FilterIcon size={14} color={showFilters ? colors.white : colors.text.secondary} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>Filters</Text>
          </Pressable>
          {hasActiveFilters && (
            <Pressable onPress={clearFilters}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Filter panel */}
        {showFilters && (
          <ScrollView style={styles.filterPanel} contentContainerStyle={styles.filterPanelContent} nestedScrollEnabled>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.chipRow}>
              {[{ key: 'student', label: 'Students' }, { key: 'companion_55', label: '55+ Companions' }].map((t) => {
                const active = typeFilter === t.key;
                return (
                  <Pressable key={t.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setTypeFilter(active ? '' : t.key)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Tasks</Text>
            <View style={styles.chipRow}>
              {ALLOWED_TASKS.map((task) => {
                const active = taskFilter.includes(task.id);
                return (
                  <Pressable
                    key={task.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setTaskFilter(active ? taskFilter.filter((t) => t !== task.id) : [...taskFilter, task.id])}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{task.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.chip, transportFilter && styles.chipActive, { marginTop: spacing[2] }]}
              onPress={() => setTransportFilter(!transportFilter)}
            >
              <Text style={[styles.chipText, transportFilter && styles.chipTextActive]}>{'\uD83D\uDE97'} Has transportation</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {hasActiveFilters || searchText
              ? `Showing ${filtered.length} of ${companions.length}`
              : `${companions.length} companions`}
          </Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CompanionIcon size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>{loading ? 'Loading...' : 'No companions found'}</Text>
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
  filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[3], paddingVertical: 6, borderRadius: borderRadius['2xl'], backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
  filterToggleActive: { backgroundColor: roleColors.agency_owner, borderColor: roleColors.agency_owner },
  filterToggleText: { ...typography.styles.bodySmall, color: colors.text.secondary, fontWeight: '600' },
  filterToggleTextActive: { color: colors.white },
  clearText: { ...typography.styles.bodySmall, color: colors.error[500], fontWeight: '600' },
  filterPanel: { maxHeight: 200, borderBottomWidth: 1, borderBottomColor: colors.neutral[200] },
  filterPanelContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  filterLabel: { ...typography.styles.caption, color: colors.text.secondary, fontWeight: '700', marginTop: spacing[2], marginBottom: spacing[1] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: spacing[1], borderRadius: borderRadius['2xl'], backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: roleColors.agency_owner + '20', borderColor: roleColors.agency_owner },
  chipText: { ...typography.styles.caption, color: colors.text.secondary, fontWeight: '500' },
  chipTextActive: { color: roleColors.agency_owner, fontWeight: '700' },
  countRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  countText: { ...typography.styles.bodySmall, color: colors.text.tertiary },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },

  // Card
  card: { padding: 0 },
  cardRow: { flexDirection: 'row', padding: spacing[3], gap: spacing[3] },
  cardPhoto: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.neutral[100] },
  cardPhotoImg: { width: '100%', height: '100%' },
  cardPhotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { ...typography.styles.body, color: colors.text.primary, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: borderRadius.sm },
  studentBadge: { backgroundColor: '#7C3AED' },
  companionBadge: { backgroundColor: '#059669' },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  zipText: { ...typography.styles.caption, color: colors.text.tertiary },
  taskRow: { flexDirection: 'row', gap: spacing[1], marginTop: spacing[1] },
  taskEmoji: { fontSize: 13 },
  availText: { ...typography.styles.caption, color: colors.text.secondary, marginTop: 2 },
  inviteRow: { marginTop: spacing[2] },
  linkedBadge: { backgroundColor: colors.success[50], paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.md, alignSelf: 'flex-start' },
  linkedText: { ...typography.styles.caption, color: colors.success[700], fontWeight: '600' },
  pendingBadge: { backgroundColor: colors.warning[50], paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.md, alignSelf: 'flex-start' },
  pendingText: { ...typography.styles.caption, color: colors.warning[700], fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: spacing[10], gap: spacing[3] },
  emptyTitle: { ...typography.styles.body, color: colors.text.tertiary },
});
