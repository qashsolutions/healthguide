// HealthGuide Caregiver Management
// Per healthguide-agency/caregiver-mgmt skill

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { PersonIcon, PlusIcon, PhoneIcon, SearchIcon, UsersIcon, CloseIcon, FilterIcon, CompanionIcon } from '@/components/icons';

// --- Constants ---

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const TIME_SLOTS = [
  { label: '6–8a', value: '6am-8am' },
  { label: '8–10a', value: '8am-10am' },
  { label: '10–12p', value: '10am-12pm' },
  { label: '12–2p', value: '12pm-2pm' },
  { label: '2–4p', value: '2pm-4pm' },
  { label: '4–6p', value: '4pm-6pm' },
  { label: '6–8p', value: '6pm-8pm' },
  { label: '8–10p', value: '8pm-10pm' },
];

function getTodayKey(): string {
  return DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}

// --- Types ---

interface Caregiver {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  photo_url?: string;
  zip_code: string;
  availability: Record<string, string[]> | null;
  // Computed stats
  active_visits: number;
  today_visits: number;
}

export default function CaregiversScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter state
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showAvailPicker, setShowAvailPicker] = useState(false);
  const [availDays, setAvailDays] = useState<string[]>([]);
  const [availTimeSlots, setAvailTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchCaregivers();
  }, [user?.agency_id]);

  async function fetchCaregivers() {
    if (!user?.agency_id) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: linksData, error } = await supabase
        .from('caregiver_agency_links')
        .select(`
          caregiver_profile:caregiver_profiles (
            id,
            full_name,
            phone,
            is_active,
            photo_url,
            zip_code,
            availability
          )
        `)
        .eq('agency_id', user.agency_id)
        .eq('is_active', true);

      const caregiversData = (linksData || [])
        .map((link: any) => Array.isArray(link.caregiver_profile) ? link.caregiver_profile[0] : link.caregiver_profile)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''));

      if (error) throw error;

      if (caregiversData) {
        const { data: visitsData } = await supabase
          .from('visits')
          .select('caregiver_id, status')
          .eq('agency_id', user.agency_id)
          .eq('scheduled_date', today);

        const caregiversWithStats = caregiversData.map((c: any) => {
          const caregiverVisits = visitsData?.filter(v => v.caregiver_id === c.id) || [];
          return {
            id: c.id,
            full_name: c.full_name || 'Unknown',
            phone: c.phone || '',
            is_active: c.is_active ?? true,
            photo_url: c.photo_url,
            zip_code: c.zip_code || '',
            availability: c.availability || null,
            active_visits: caregiverVisits.filter(v => v.status === 'in_progress').length,
            today_visits: caregiverVisits.length,
          };
        });

        setCaregivers(caregiversWithStats);
      }
    } catch (error) {
      console.error('Error fetching caregivers:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchCaregivers();
    setRefreshing(false);
  }

  function handleAddCaregiver() {
    router.push('/(protected)/agency/caregiver/new');
  }

  // --- Smart search: detect zip (all digits) vs name ---
  const isZipSearch = /^\d{1,5}$/.test(search.trim());

  const hasActiveFilters = search !== '' || selectedLetter !== null || availDays.length > 0 || availTimeSlots.length > 0;

  const filteredCaregivers = useMemo(() => {
    let result = caregivers;

    // Smart search
    if (search.trim()) {
      if (isZipSearch) {
        result = result.filter((c) => c.zip_code.startsWith(search.trim()));
      } else {
        const q = search.toLowerCase();
        result = result.filter(
          (c) => c.full_name.toLowerCase().includes(q) || c.phone.includes(search)
        );
      }
    }

    // Letter filter
    if (selectedLetter) {
      result = result.filter((c) =>
        c.full_name.toUpperCase().startsWith(selectedLetter)
      );
    }

    // Availability: day/time filter
    if (availDays.length > 0 || availTimeSlots.length > 0) {
      result = result.filter((c) => {
        if (!c.availability) return false;
        const daysToCheck = availDays.length > 0 ? availDays : Object.keys(c.availability);
        const slotsToMatch = availTimeSlots.length > 0 ? availTimeSlots : null;

        return daysToCheck.some((dayKey) => {
          const daySlots = c.availability![dayKey] || [];
          if (!slotsToMatch) return daySlots.length > 0;
          return slotsToMatch.some((slot) => daySlots.includes(slot));
        });
      });
    }

    return result;
  }, [caregivers, search, isZipSearch, selectedLetter, availDays, availTimeSlots]);

  // Compute which letters have caregivers (excluding letter filter)
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    caregivers.forEach((c) => {
      const first = c.full_name.charAt(0).toUpperCase();
      if (first >= 'A' && first <= 'Z') letters.add(first);
    });
    return letters;
  }, [caregivers]);

  function clearAllFilters() {
    setSearch('');
    setSelectedLetter(null);
    setShowAvailPicker(false);
    setAvailDays([]);
    setAvailTimeSlots([]);
  }

  function toggleDay(dayKey: string) {
    setAvailDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  }

  function toggleTimeSlot(slotValue: string) {
    setAvailTimeSlots((prev) =>
      prev.includes(slotValue) ? prev.filter((s) => s !== slotValue) : [...prev, slotValue]
    );
  }

  const showZipHint = isZipSearch;
  const showAvailHint = search.toLowerCase().startsWith('avail');

  const renderCaregiver = ({ item }: { item: Caregiver }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Pressable
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        style={[styles.caregiverCard, isExpanded && styles.caregiverCardExpanded]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <PersonIcon size={28} color={roleColors.caregiver} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.caregiverName} numberOfLines={1}>{item.full_name}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {item.active_visits > 0 && (
              <Badge label={`${item.active_visits} active`} variant="success" size="sm" />
            )}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.is_active ? colors.success[500] : colors.error[500] },
              ]}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.phone ? (
              <View style={styles.phoneRow}>
                <PhoneIcon size={14} color={colors.text.secondary} />
                <Text style={styles.phoneText}>{item.phone}</Text>
              </View>
            ) : null}

            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.active_visits}</Text>
                <Text style={styles.statLabel}>Active Now</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.today_visits}</Text>
                <Text style={styles.statLabel}>Today's Visits</Text>
              </View>
            </View>

            <Button
              title="View Profile"
              variant="secondary"
              size="sm"
              onPress={() => router.push(`/(protected)/agency/caregiver/${item.id}`)}
              fullWidth
            />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.count}>
          {hasActiveFilters
            ? `Showing ${filteredCaregivers.length} of ${caregivers.length} Caregivers`
            : `${caregivers.length} Available Caregivers`}
        </Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.browseButton}
            onPress={() => router.push('/(protected)/agency/browse-directory' as any)}
          >
            <CompanionIcon size={14} color={colors.white} />
            <Text style={styles.browseButtonText}>Browse</Text>
          </Pressable>
          <Button
            title="+ Add"
            variant="primary"
            size="sm"
            onPress={handleAddCaregiver}
          />
        </View>
      </View>

      {/* A-Z Alphabet Bar */}
      <View style={styles.alphabetContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.alphabetBar}
        >
          <Pressable
            onPress={() => setSelectedLetter(null)}
            style={[styles.letterButton, selectedLetter === null && styles.letterButtonActive]}
          >
            <Text style={[styles.letterText, selectedLetter === null && styles.letterTextActive]}>
              All
            </Text>
          </Pressable>
          {ALPHABET.map((letter) => {
            const hasMatches = availableLetters.has(letter);
            const isSelected = selectedLetter === letter;
            return (
              <Pressable
                key={letter}
                onPress={() => {
                  if (!hasMatches && !isSelected) return;
                  setSelectedLetter(isSelected ? null : letter);
                }}
                disabled={!hasMatches && !isSelected}
                style={[
                  styles.letterButton,
                  isSelected && styles.letterButtonActive,
                  !hasMatches && !isSelected && styles.letterButtonDimmed,
                ]}
              >
                <Text
                  style={[
                    styles.letterText,
                    isSelected && styles.letterTextActive,
                    !hasMatches && !isSelected && styles.letterTextDimmed,
                  ]}
                >
                  {letter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Box */}
      <View style={styles.searchBox}>
        <View style={styles.searchRow}>
          <SearchIcon size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder='Search name, zip code, or "available"'
            placeholderTextColor={colors.text.secondary}
          />
          {search !== '' && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <CloseIcon size={16} color={colors.text.secondary} />
            </Pressable>
          )}
        </View>

        {/* Contextual hint when typing zip */}
        {showZipHint && (
          <Text style={styles.searchHint}>
            Filtering by zip code prefix "{search.trim()}"
          </Text>
        )}

        {/* Contextual hint when typing "available" */}
        {showAvailHint && !showAvailPicker && (
          <View style={styles.hintRow}>
            <Text style={styles.searchHint}>Looking for availability?</Text>
            <Pressable
              onPress={() => { setSearch(''); setShowAvailPicker(true); }}
              style={styles.hintAction}
            >
              <Text style={styles.hintActionText}>Show available</Text>
            </Pressable>
          </View>
        )}

        {/* Quick-filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => {
              if (showAvailPicker) {
                setShowAvailPicker(false);
                setAvailDays([]);
                setAvailTimeSlots([]);
              } else {
                setShowAvailPicker(true);
              }
            }}
            style={[styles.chip, showAvailPicker && styles.chipActive]}
          >
            <FilterIcon size={12} color={showAvailPicker ? colors.white : colors.text.secondary} />
            <Text style={[styles.chipText, showAvailPicker && styles.chipTextActive]}>Available</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const today = getTodayKey();
              if (availDays.includes(today) && availDays.length === 1 && !showAvailPicker) {
                setAvailDays([]);
              } else {
                setShowAvailPicker(false);
                setAvailDays([today]);
                setAvailTimeSlots([]);
              }
            }}
            style={[styles.chip, availDays.length > 0 && !showAvailPicker && styles.chipActive]}
          >
            <Text style={[styles.chipText, availDays.length > 0 && !showAvailPicker && styles.chipTextActive]}>
              Available Today
            </Text>
          </Pressable>

          {/* Active filter tags */}
          {availDays.map((dk) => (
            <Pressable
              key={dk}
              onPress={() => toggleDay(dk)}
              style={[styles.chip, styles.chipActive]}
            >
              <Text style={styles.chipTextActive}>{DAY_LABELS[dk]}</Text>
              <CloseIcon size={10} color={colors.white} />
            </Pressable>
          ))}
          {availTimeSlots.map((sv) => {
            const slot = TIME_SLOTS.find((s) => s.value === sv);
            return (
              <Pressable
                key={sv}
                onPress={() => toggleTimeSlot(sv)}
                style={[styles.chip, styles.chipActive]}
              >
                <Text style={styles.chipTextActive}>{slot?.label ?? sv}</Text>
                <CloseIcon size={10} color={colors.white} />
              </Pressable>
            );
          })}

          {hasActiveFilters && (
            <Pressable onPress={clearAllFilters} style={styles.clearChip}>
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Availability day/time picker — shown when "Available" chip is toggled */}
      {showAvailPicker && (
        <View style={styles.availPicker}>
          <View style={styles.availSection}>
            {DAY_KEYS.map((dk) => {
              const isActive = availDays.includes(dk);
              return (
                <Pressable
                  key={dk}
                  onPress={() => toggleDay(dk)}
                  style={[styles.availChip, isActive && styles.availChipActive]}
                >
                  <Text style={[styles.availChipText, isActive && styles.availChipTextActive]}>
                    {DAY_LABELS[dk]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.availDivider} />
          <View style={styles.availSection}>
            {TIME_SLOTS.map((slot) => {
              const isActive = availTimeSlots.includes(slot.value);
              return (
                <Pressable
                  key={slot.value}
                  onPress={() => toggleTimeSlot(slot.value)}
                  style={[styles.availChip, isActive && styles.availChipActive]}
                >
                  <Text style={[styles.availChipText, isActive && styles.availChipTextActive]}>
                    {slot.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <FlatList
        data={filteredCaregivers}
        renderItem={renderCaregiver}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <UsersIcon size={48} color={colors.neutral[300]} />
            </View>
            <Text style={styles.emptyText}>
              {loading ? 'Loading caregivers...' : hasActiveFilters ? 'No caregivers match filters' : 'No caregivers yet'}
            </Text>
            {!loading && !hasActiveFilters && (
              <Text style={styles.emptySubtext}>
                Add your first caregiver to get started
              </Text>
            )}
            {!loading && hasActiveFilters && (
              <Pressable onPress={clearAllFilters} style={{ marginTop: spacing[2] }}>
                <Text style={styles.clearText}>Clear all filters</Text>
              </Pressable>
            )}
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  count: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: borderRadius['2xl'],
    backgroundColor: '#059669',
  },
  browseButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },

  // A-Z Alphabet Bar
  alphabetContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    paddingVertical: spacing[2],
  },
  alphabetBar: {
    paddingHorizontal: spacing[3],
    gap: 6,
    alignItems: 'center',
  },
  letterButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  letterButtonActive: {
    backgroundColor: colors.primary[500],
  },
  letterButtonDimmed: {
    opacity: 0.25,
  },
  letterText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  letterTextActive: {
    color: colors.white,
  },
  letterTextDimmed: {
    color: colors.text.secondary,
  },

  // Search Box (unified container)
  searchBox: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingBottom: spacing[2],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    ...typography.styles.body,
    color: colors.text.primary,
  },
  searchHint: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[1],
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    marginBottom: spacing[1],
    gap: spacing[2],
  },
  hintAction: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  hintActionText: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.primary[600],
  },

  // Suggestion chips inside search box
  chipRow: {
    paddingHorizontal: spacing[3],
    gap: spacing[2],
    alignItems: 'center',
    paddingTop: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipActive: {
    backgroundColor: roleColors.agency_owner,
    borderColor: roleColors.agency_owner,
  },
  chipText: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chipTextActive: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.white,
  },
  clearChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  clearText: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.primary[500],
  },

  // Availability Picker (below search box)
  availPicker: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  availSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  availDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[2],
  },
  availChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  availChipActive: {
    backgroundColor: roleColors.agency_owner,
    borderColor: roleColors.agency_owner,
  },
  availChipText: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.primary,
  },
  availChipTextActive: {
    color: colors.white,
  },

  // List & Cards
  list: {
    padding: spacing[4],
    paddingBottom: 100,
  },
  separator: {
    height: spacing[3],
  },
  caregiverCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing[3],
  },
  caregiverCardExpanded: {
    borderColor: roleColors.caregiver,
    backgroundColor: colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  cardInfo: {
    flex: 1,
  },
  caregiverName: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontSize: 15,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  expandedContent: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: spacing[3],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  phoneText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardStats: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing[4],
  },
  statValue: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyIcon: {
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
});
