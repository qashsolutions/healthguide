// HealthGuide Public Companion Browse
// Unauthenticated search: first-name-only, no favorites, signup prompt on card tap

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import {
  SearchIcon,
  FilterIcon,
  CloseIcon,
  CompanionIcon,
  StudentIcon,
  PersonIcon,
  ArrowLeftIcon,
} from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ALLOWED_TASKS } from '@/constants/tasks';

interface PublicCompanion {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  selfie_url: string | null;
  caregiver_type: 'student' | 'companion_55';
  zip_code: string;
  capabilities: string[];
  availability: Record<string, string[]> | null;
  languages: string[];
  bio: string | null;
  has_transportation: boolean;
  gender: string;
  college_name?: string;
}

const DAYS_SHORT = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const LANGUAGE_LABELS: Record<string, string> = {
  english: 'English', spanish: 'Spanish', mandarin: 'Mandarin',
  cantonese: 'Cantonese', tagalog: 'Tagalog', vietnamese: 'Vietnamese',
  korean: 'Korean', hindi: 'Hindi', arabic: 'Arabic', french: 'French',
  portuguese: 'Portuguese', russian: 'Russian', japanese: 'Japanese',
  haitian_creole: 'Haitian Creole', other: 'Other',
};

function summarizeAvailability(avail: Record<string, string[]> | null): string {
  if (!avail) return 'Not specified';
  const days = Object.keys(avail).filter((d) => (avail[d] || []).length > 0);
  if (days.length === 0) return 'Not specified';
  const dayLabels = days.map((d) => {
    const found = DAYS_SHORT.find((ds) => ds.key === d);
    return found?.label || d;
  });
  if (dayLabels.length <= 3) return dayLabels.join(', ');
  return `${dayLabels.slice(0, 3).join(', ')} +${dayLabels.length - 3}`;
}

const TASK_ICONS: Record<string, string> = {
  companionship: '\uD83D\uDCAC',
  light_cleaning: '\uD83E\uDDF9',
  groceries: '\uD83D\uDED2',
};

export default function BrowseCompanionsScreen() {
  const router = useRouter();
  const [companions, setCompanions] = useState<PublicCompanion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [transportFilter, setTransportFilter] = useState(false);

  const hasActiveFilters =
    taskFilter.length > 0 ||
    dayFilter.length > 0 ||
    languageFilter !== '' ||
    genderFilter !== '' ||
    transportFilter;

  const activeFilterCount =
    taskFilter.length +
    dayFilter.length +
    (languageFilter ? 1 : 0) +
    (genderFilter ? 1 : 0) +
    (transportFilter ? 1 : 0);

  const loadCompanions = useCallback(async () => {
    try {
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

      const cards: PublicCompanion[] = (profiles || []).map((p) => ({
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
      }));

      setCompanions(cards);
    } catch (err) {
      console.error('Error loading companions:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCompanions();
  }, [loadCompanions]);

  async function onRefresh() {
    setRefreshing(true);
    await loadCompanions();
    setRefreshing(false);
  }

  function clearFilters() {
    setTaskFilter([]);
    setDayFilter([]);
    setLanguageFilter('');
    setGenderFilter('');
    setTransportFilter(false);
  }

  // Filtering pipeline
  const filtered = useMemo(() => {
    let result = [...companions];

    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase();
      if (/^\d{1,5}$/.test(searchText.trim())) {
        result = result.filter((c) => c.zip_code?.startsWith(searchText.trim()));
      } else {
        result = result.filter((c) =>
          c.full_name.split(' ')[0].toLowerCase().includes(lower)
        );
      }
    }

    if (taskFilter.length > 0) {
      result = result.filter((c) =>
        taskFilter.every((t) => c.capabilities?.includes(t))
      );
    }

    if (dayFilter.length > 0) {
      result = result.filter((c) => {
        if (!c.availability) return false;
        return dayFilter.some(
          (d) => c.availability![d] && c.availability![d].length > 0
        );
      });
    }

    if (languageFilter) {
      result = result.filter((c) => c.languages?.includes(languageFilter));
    }

    if (genderFilter) {
      result = result.filter((c) => c.gender === genderFilter);
    }

    if (transportFilter) {
      result = result.filter((c) => c.has_transportation);
    }

    return result;
  }, [companions, searchText, taskFilter, dayFilter, languageFilter, genderFilter, transportFilter]);

  function renderCompanionCard({ item }: { item: PublicCompanion }) {
    // First name only for unauthenticated users
    const displayName = item.full_name.split(' ')[0];
    const photo = item.selfie_url || item.photo_url;
    const isStudent = item.caregiver_type === 'student';

    return (
      <Card
        style={styles.companionCard}
        onPress={() => setShowSignupModal(true)}
      >
        <View style={styles.cardRow}>
          {/* Photo */}
          <View style={styles.cardPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.cardPhotoImage} />
            ) : (
              <View style={styles.cardPhotoPlaceholder}>
                <PersonIcon size={28} color={colors.neutral[400]} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{displayName}</Text>

            {/* Type badge */}
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, isStudent ? styles.studentBadge : styles.companionBadge]}>
                {isStudent ? (
                  <StudentIcon size={12} color={colors.white} />
                ) : (
                  <CompanionIcon size={12} color={colors.white} />
                )}
                <Text style={styles.typeBadgeText}>
                  {isStudent ? 'Student' : '55+ Companion'}
                </Text>
              </View>
              {item.zip_code && (
                <Text style={styles.zipText}>ZIP {item.zip_code}</Text>
              )}
            </View>

            {/* Task icons */}
            <View style={styles.taskIconRow}>
              {(item.capabilities || []).map((cap) => (
                <Text key={cap} style={styles.taskEmoji}>
                  {TASK_ICONS[cap] || '\u2022'}
                </Text>
              ))}
              {item.has_transportation && (
                <Text style={styles.taskEmoji}>{'\uD83D\uDE97'}</Text>
              )}
            </View>

            {/* Availability summary */}
            <Text style={styles.availText}>
              {summarizeAvailability(item.availability)}
            </Text>

            {/* Bio snippet */}
            {item.bio && (
              <Text style={styles.bioSnippet} numberOfLines={1}>
                "{item.bio}"
              </Text>
            )}
          </View>
        </View>
      </Card>
    );
  }

  const resultCount = filtered.length;
  const totalCount = companions.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeftIcon size={24} color={colors.neutral[700]} />
        </Pressable>
        <Text style={styles.headerTitle}>Find a Companion</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sign-up banner */}
      <Pressable
        style={styles.signupBanner}
        onPress={() => setShowSignupModal(true)}
      >
        <Text style={styles.signupBannerText}>
          Sign up to see full profiles and request visits
        </Text>
      </Pressable>

      {/* Combined search + filter bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, showFilters && styles.searchBarActive]}>
          <SearchIcon size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or zip code..."
            placeholderTextColor={colors.neutral[400]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8} style={styles.searchAction}>
              <CloseIcon size={18} color={colors.neutral[400]} />
            </Pressable>
          ) : null}
          <View style={styles.searchDivider} />
          <Pressable
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FilterIcon size={16} color={showFilters ? colors.white : colors.text.secondary} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </Pressable>
        </View>
        {hasActiveFilters && (
          <Pressable onPress={clearFilters} style={styles.clearRow}>
            <Text style={styles.clearText}>Clear all filters</Text>
          </Pressable>
        )}
      </View>

      {/* Expandable filter panel */}
      {showFilters && (
        <ScrollView
          style={styles.filterPanel}
          contentContainerStyle={styles.filterPanelContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Tasks */}
          <Text style={styles.filterLabel}>Tasks</Text>
          <View style={styles.chipRow}>
            {ALLOWED_TASKS.map((task) => {
              const active = taskFilter.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    if (active) {
                      setTaskFilter(taskFilter.filter((t) => t !== task.id));
                    } else {
                      setTaskFilter([...taskFilter, task.id]);
                    }
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {task.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Days */}
          <Text style={styles.filterLabel}>Days Available</Text>
          <View style={styles.chipRow}>
            {DAYS_SHORT.map((day) => {
              const active = dayFilter.includes(day.key);
              return (
                <Pressable
                  key={day.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    if (active) {
                      setDayFilter(dayFilter.filter((d) => d !== day.key));
                    } else {
                      setDayFilter([...dayFilter, day.key]);
                    }
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Language */}
          <Text style={styles.filterLabel}>Language</Text>
          <View style={styles.chipRow}>
            {['english', 'spanish', 'mandarin', 'cantonese', 'tagalog', 'vietnamese', 'korean', 'hindi', 'arabic', 'french', 'portuguese', 'russian', 'japanese', 'haitian_creole', 'other'].map((lang) => {
              const active = languageFilter === lang;
              return (
                <Pressable
                  key={lang}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setLanguageFilter(active ? '' : lang)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Gender */}
          <Text style={styles.filterLabel}>Gender</Text>
          <View style={styles.chipRow}>
            {[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }, { key: 'other', label: 'Other' }].map((g) => {
              const active = genderFilter === g.key;
              return (
                <Pressable
                  key={g.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setGenderFilter(active ? '' : g.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Transportation */}
          <Pressable
            style={[styles.chip, transportFilter && styles.chipActive, { marginTop: spacing[2] }]}
            onPress={() => setTransportFilter(!transportFilter)}
          >
            <Text style={[styles.chipText, transportFilter && styles.chipTextActive]}>
              {'\uD83D\uDE97'} Has transportation
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Results count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {hasActiveFilters || searchText
            ? `Showing ${resultCount} of ${totalCount} companions`
            : `${totalCount} companions`}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCompanionCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <CompanionIcon size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading companions...' : 'No companions found'}
            </Text>
            {hasActiveFilters && !loading && (
              <Pressable onPress={clearFilters}>
                <Text style={styles.clearFiltersLink}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Signup prompt modal */}
      <Modal
        visible={showSignupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignupModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSignupModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign up to connect</Text>
            <Text style={styles.modalBody}>
              Create an account to see full profiles and request visits with companions.
            </Text>

            <Pressable
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                setShowSignupModal(false);
                router.push('/(auth)/join-group' as any);
              }}
            >
              <Text style={styles.modalButtonPrimaryText}>I need care</Text>
            </Pressable>

            <Pressable
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => {
                setShowSignupModal(false);
                router.push('/(auth)/join-group' as any);
              }}
            >
              <Text style={styles.modalButtonSecondaryText}>I'm a family member</Text>
            </Pressable>

            <Pressable
              style={styles.modalCancel}
              onPress={() => setShowSignupModal(false)}
            >
              <Text style={styles.modalCancelText}>Maybe later</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  signupBanner: {
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  signupBannerText: {
    ...typography.styles.bodySmall,
    color: colors.primary[700],
    fontWeight: '600',
    textAlign: 'center',
  },
  searchRow: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 56,
    gap: spacing[2],
  },
  searchBarActive: {
    borderColor: colors.primary[500],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: spacing[2],
    outlineStyle: 'none' as any,
  },
  searchAction: {
    padding: spacing[1],
  },
  searchDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral[300],
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius['2xl'],
  },
  filterToggleActive: {
    backgroundColor: roleColors.careseeker,
  },
  filterToggleText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterToggleTextActive: {
    color: colors.white,
  },
  clearRow: {
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
  clearText: {
    ...typography.styles.caption,
    color: colors.error[500],
    fontWeight: '600',
  },
  filterPanel: {
    maxHeight: 340,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  filterPanelContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  filterLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '700',
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5] || 6,
  },
  chip: {
    paddingHorizontal: spacing[2.5] || 10,
    paddingVertical: spacing[1],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipActive: {
    backgroundColor: roleColors.careseeker + '20',
    borderColor: roleColors.careseeker,
  },
  chipText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: roleColors.careseeker,
    fontWeight: '700',
  },
  countRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  countText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  companionCard: {
    padding: 0,
  },
  cardRow: {
    flexDirection: 'row',
    padding: spacing[3],
    gap: spacing[3],
  },
  cardPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  cardPhotoImage: {
    width: '100%',
    height: '100%',
  },
  cardPhotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[1.5] || 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  studentBadge: {
    backgroundColor: '#7C3AED',
  },
  companionBadge: {
    backgroundColor: '#059669',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  zipText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  taskIconRow: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  taskEmoji: {
    fontSize: 14,
  },
  availText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  bioSnippet: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing[10],
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  clearFiltersLink: {
    ...typography.styles.bodySmall,
    color: roleColors.careseeker,
    fontWeight: '600',
  },

  // Signup modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  modalBody: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  modalButton: {
    width: '100%',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary[600],
  },
  modalButtonPrimaryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  modalButtonSecondary: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  modalButtonSecondaryText: {
    color: colors.primary[700],
    fontWeight: '700',
    fontSize: 16,
  },
  modalCancel: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
  },
  modalCancelText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
});
