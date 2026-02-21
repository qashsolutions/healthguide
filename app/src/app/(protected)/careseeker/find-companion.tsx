// HealthGuide Companion Directory
// Browse and filter independent companions by tasks, availability, language, gender, transportation
// Used by careseeker (elder) and family member roles

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import {
  SearchIcon,
  StarIcon,
  FilterIcon,
  CloseIcon,
  CompanionIcon,
  StudentIcon,
  PersonIcon,
  ArrowLeftIcon,
} from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { ALLOWED_TASKS } from '@/constants/tasks';

interface CompanionCard {
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
  travel_radius_miles: number;
  college_name?: string;
  average_rating: number | null;
  total_visits: number;
  is_favorite: boolean;
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

export default function FindCompanionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [companions, setCompanions] = useState<CompanionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

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
      // Fetch active, completed companion profiles
      const { data: profiles, error } = await supabase
        .from('caregiver_profiles')
        .select(`
          id, user_id, full_name, caregiver_type, zip_code,
          capabilities, availability, languages, bio, gender,
          has_transportation, college_name, photo_url, selfie_url,
          travel_radius_miles
        `)
        .in('caregiver_type', ['student', 'companion_55'])
        .eq('is_active', true)
        .eq('profile_completed', true);

      if (error) throw error;

      // Fetch favorites for this elder
      let favoriteIds = new Set<string>();
      if (user?.id) {
        // Get elder_id from user — could be the careseeker themselves or via family_members
        const { data: elderData } = await supabase
          .from('elders')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const elderId = elderData?.id;
        if (elderId) {
          const { data: favs } = await supabase
            .from('elder_favorites')
            .select('companion_id')
            .eq('elder_id', elderId);
          favoriteIds = new Set((favs || []).map((f) => f.companion_id));
        }
      }

      // Fetch ratings
      const userIds = (profiles || []).map((p) => p.user_id);
      let ratingsMap: Record<string, { avg: number; count: number }> = {};
      if (userIds.length > 0) {
        const { data: ratings } = await supabase
          .from('visit_ratings')
          .select('rated_user, rating')
          .in('rated_user', userIds);

        if (ratings) {
          const grouped: Record<string, number[]> = {};
          ratings.forEach((r) => {
            if (!grouped[r.rated_user]) grouped[r.rated_user] = [];
            grouped[r.rated_user].push(r.rating);
          });
          Object.entries(grouped).forEach(([uid, vals]) => {
            ratingsMap[uid] = {
              avg: vals.reduce((a, b) => a + b, 0) / vals.length,
              count: vals.length,
            };
          });
        }
      }

      // Combine into CompanionCard
      const cards: CompanionCard[] = (profiles || []).map((p) => ({
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
        travel_radius_miles: p.travel_radius_miles || 10,
        college_name: p.college_name,
        average_rating: ratingsMap[p.user_id]?.avg || null,
        total_visits: ratingsMap[p.user_id]?.count || 0,
        is_favorite: favoriteIds.has(p.user_id),
      }));

      setCompanions(cards);
    } catch (err) {
      console.error('Error loading companions:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadCompanions();
  }, [loadCompanions]);

  async function onRefresh() {
    setRefreshing(true);
    await loadCompanions();
    setRefreshing(false);
  }

  async function toggleFavorite(companion: CompanionCard) {
    if (!user?.id) return;

    // Get elder_id
    const { data: elderData } = await supabase
      .from('elders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!elderData?.id) return;

    if (companion.is_favorite) {
      await supabase
        .from('elder_favorites')
        .delete()
        .eq('elder_id', elderData.id)
        .eq('companion_id', companion.user_id);
    } else {
      await supabase
        .from('elder_favorites')
        .insert({ elder_id: elderData.id, companion_id: companion.user_id });
    }

    // Update local state
    setCompanions((prev) =>
      prev.map((c) =>
        c.id === companion.id ? { ...c, is_favorite: !c.is_favorite } : c
      )
    );
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

    // 1. Text search (name or zip prefix)
    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase();
      if (/^\d{1,5}$/.test(searchText.trim())) {
        result = result.filter((c) => c.zip_code?.startsWith(searchText.trim()));
      } else {
        result = result.filter((c) => c.full_name.toLowerCase().includes(lower));
      }
    }

    // 2. Task filter
    if (taskFilter.length > 0) {
      result = result.filter((c) =>
        taskFilter.every((t) => c.capabilities?.includes(t))
      );
    }

    // 3. Day filter
    if (dayFilter.length > 0) {
      result = result.filter((c) => {
        if (!c.availability) return false;
        return dayFilter.some(
          (d) => c.availability![d] && c.availability![d].length > 0
        );
      });
    }

    // 4. Language filter
    if (languageFilter) {
      result = result.filter((c) => c.languages?.includes(languageFilter));
    }

    // 5. Gender filter
    if (genderFilter) {
      result = result.filter((c) => c.gender === genderFilter);
    }

    // 6. Transportation filter
    if (transportFilter) {
      result = result.filter((c) => c.has_transportation);
    }

    // Sort: favorites first, then rating
    result.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return (b.average_rating || 0) - (a.average_rating || 0);
    });

    return result;
  }, [companions, searchText, taskFilter, dayFilter, languageFilter, genderFilter, transportFilter]);

  function renderCompanionCard({ item }: { item: CompanionCard }) {
    const displayName = item.full_name.split(' ')[0] + (item.full_name.split(' ')[1] ? ` ${item.full_name.split(' ')[1][0]}.` : '');
    const photo = item.selfie_url || item.photo_url;
    const isStudent = item.caregiver_type === 'student';

    return (
      <Card
        style={styles.companionCard}
        onPress={() => router.push(`/(protected)/careseeker/companion/${item.id}` as any)}
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
            <View style={styles.cardNameRow}>
              <Text style={styles.cardName}>{displayName}</Text>
              <Pressable
                onPress={() => toggleFavorite(item)}
                hitSlop={8}
                style={styles.favButton}
              >
                <StarIcon
                  size={20}
                  color={item.is_favorite ? colors.warning[500] : colors.neutral[300]}
                />
              </Pressable>
            </View>

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

            {/* Rating */}
            {item.average_rating != null && (
              <Text style={styles.ratingText}>
                {'\u2B50'} {item.average_rating.toFixed(1)} ({item.total_visits} visits)
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
    <>
      <Stack.Screen options={{ title: 'Find a Companion', headerShown: true, headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchRow}>
          <Input
            placeholder="Search name or zip code..."
            value={searchText}
            onChangeText={setSearchText}
            leftIcon={<SearchIcon size={20} color={colors.neutral[400]} />}
            rightIcon={
              searchText ? <CloseIcon size={18} color={colors.neutral[400]} /> : undefined
            }
            onRightIconPress={() => setSearchText('')}
          />
        </View>

        {/* Filter toggle + chips */}
        <View style={styles.filterBar}>
          <Pressable
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FilterIcon size={16} color={showFilters ? colors.white : colors.text.secondary} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </Pressable>

          {hasActiveFilters && (
            <Pressable onPress={clearFilters}>
              <Text style={styles.clearText}>Clear all</Text>
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
              {['english', 'spanish', 'mandarin', 'tagalog', 'vietnamese', 'korean'].map((lang) => {
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
              {[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }].map((g) => {
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
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5] || 6,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterToggleActive: {
    backgroundColor: roleColors.careseeker,
    borderColor: roleColors.careseeker,
  },
  filterToggleText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterToggleTextActive: {
    color: colors.white,
  },
  clearText: {
    ...typography.styles.bodySmall,
    color: colors.error[500],
    fontWeight: '600',
  },

  // Filter panel
  filterPanel: {
    maxHeight: 260,
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

  // Count
  countRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  countText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },

  // List
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },

  // Companion card
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
  cardNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  favButton: {
    padding: spacing[1],
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
  ratingText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginTop: 2,
  },

  // Empty
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
});
