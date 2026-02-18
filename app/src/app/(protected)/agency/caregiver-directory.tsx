// HealthGuide Caregiver Directory
// Searchable marketplace for agency owners to find caregivers

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FilterIcon,
  ElderIcon,
  CloseIcon,
} from '@/components/icons';
import { RatingSummary } from '@/components/caregiver/RatingSummary';

interface CaregiverResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  zip_code: string;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  npi_verified: boolean;
  capabilities: string[];
  availability: Record<string, string[]> | null;
  bio: string | null;
  rating_count: number;
  positive_count: number;
}

interface Elder {
  id: string;
  first_name: string;
  last_name: string;
  zip_code: string | null;
}

interface ElderTask {
  task_id: string;
  task_library: { name: string; category: string } | null;
}

interface FilterState {
  zipCode: string;
  morningAvailable: boolean;
  afternoonAvailable: boolean;
  eveningAvailable: boolean;
  maxRate: string;
}

export default function CaregiverDirectoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [filters, setFilters] = useState<FilterState>({
    zipCode: '',
    morningAvailable: false,
    afternoonAvailable: false,
    eveningAvailable: false,
    maxRate: '',
  });

  const [caregivers, setCaregivers] = useState<CaregiverResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [rateError, setRateError] = useState('');

  // Elder picker state
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElderId, setSelectedElderId] = useState<string | null>(null);
  const [elderTasks, setElderTasks] = useState<ElderTask[]>([]);

  const [showElderDropdown, setShowElderDropdown] = useState(false);
  const selectedElder = elders.find((e) => e.id === selectedElderId) || null;

  // Fetch elders on mount
  useEffect(() => {
    if (!user?.agency_id) return;
    (async () => {
      const { data } = await supabase
        .from('elders')
        .select('id, first_name, last_name, zip_code')
        .eq('agency_id', user.agency_id)
        .eq('is_active', true)
        .order('first_name');
      if (data) setElders(data);
    })();
  }, [user?.agency_id]);

  // Fetch elder tasks on selection
  useEffect(() => {
    if (!selectedElderId) {
      setElderTasks([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('elder_task_preferences')
        .select('task_id, task_library(name, category)')
        .eq('elder_id', selectedElderId)
        .limit(3);
      if (data) setElderTasks(data as ElderTask[]);
    })();
  }, [selectedElderId]);

  const handleSelectElder = (elder: Elder) => {
    setSelectedElderId(elder.id);
    setFilters((prev) => ({ ...prev, zipCode: elder.zip_code || '' }));
    setShowFilters(true);
    setCaregivers([]);
    setHasSearched(false);
  };

  const handleClearElder = () => {
    setSelectedElderId(null);
    setElderTasks([]);
    setFilters((prev) => ({ ...prev, zipCode: '' }));
    setCaregivers([]);
    setHasSearched(false);
  };

  // Client-side availability filter
  const filterByAvailability = (results: CaregiverResult[]): CaregiverResult[] => {
    const selectedTimes: string[] = [];
    if (filters.morningAvailable) selectedTimes.push('morning');
    if (filters.afternoonAvailable) selectedTimes.push('afternoon');
    if (filters.eveningAvailable) selectedTimes.push('evening');

    if (selectedTimes.length === 0) return results;

    return results.filter((cg) => {
      if (!cg.availability) return false;
      // Check if the caregiver has the selected time on any day
      return selectedTimes.every((time) =>
        Object.values(cg.availability!).some((slots) => slots.includes(time))
      );
    });
  };

  const handleSearch = async () => {
    if (filters.maxRate.trim()) {
      const rate = parseFloat(filters.maxRate);
      if (rate < 10) {
        setRateError('Minimum rate is $10');
        return;
      }
    }
    setRateError('');
    setLoading(true);
    setHasSearched(true);

    try {
      const filterPayload: any = {};

      if (filters.zipCode.trim()) {
        filterPayload.zip_code = filters.zipCode.trim();
      }

      if (filters.maxRate.trim()) {
        filterPayload.hourly_rate_max = parseFloat(filters.maxRate);
      }

      // Limit to 3 when elder is selected
      if (selectedElderId) {
        filterPayload.limit = 3;
      }

      const { data, error } = await supabase.functions.invoke(
        'search-caregivers',
        {
          body: filterPayload,
        }
      );

      if (error) throw error;

      const results: CaregiverResult[] = data?.caregivers || [];
      setCaregivers(filterByAvailability(results));
    } catch (error) {
      console.error('Error searching caregivers:', error);
      setCaregivers([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const renderCaregiverCard = ({ item }: { item: CaregiverResult }) => {
    const rateDisplay = item.hourly_rate_min && item.hourly_rate_max
      ? `$${item.hourly_rate_min}-$${item.hourly_rate_max}/hr`
      : item.hourly_rate_min
        ? `From $${item.hourly_rate_min}/hr`
        : 'Rate not specified';

    return (
      <Pressable
        style={styles.caregiverCard}
        onPress={() =>
          router.push(`/(protected)/agency/caregiver-profile-view?id=${item.id}` as any)
        }
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getInitials(item.full_name)}
              </Text>
            </View>
          )}
        </View>

        {/* Center Content */}
        <View style={styles.contentSection}>
          {/* Name + Badge Row */}
          <View style={styles.nameRow}>
            <Text style={styles.caregiverName}>
              {item.full_name}
            </Text>
          </View>

          {/* Location + Rate */}
          <Text style={styles.locationRate}>
            {item.zip_code} • {rateDisplay}
          </Text>

          {/* Capabilities */}
          <View style={styles.capabilitiesRow}>
            {item.capabilities.slice(0, 3).map((capability, index) => (
              <View key={index} style={styles.capabilityChip}>
                <Text style={styles.capabilityText}>{capability}</Text>
              </View>
            ))}
          </View>

          {/* Rating Summary */}
          <View style={styles.ratingRow}>
            <RatingSummary
              ratingCount={item.rating_count}
              positiveCount={item.positive_count}
              mode="compact"
            />
          </View>
        </View>

        {/* Chevron */}
        <ChevronRightIcon size={24} color={colors.text.secondary} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(protected)/agency/(tabs)')}>
          <ChevronLeftIcon size={28} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Find Caregivers</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Elder Picker Dropdown */}
      <View style={styles.elderPickerSection}>
        <Text style={styles.elderPickerLabel}>Select an elder</Text>
        <Pressable
          style={[styles.dropdownTrigger, selectedElder && styles.dropdownTriggerActive]}
          onPress={() => setShowElderDropdown(true)}
        >
          {selectedElder ? (
            <View style={styles.dropdownSelectedRow}>
              <ElderIcon size={18} color={colors.primary[700]} />
              <Text style={styles.dropdownSelectedText}>
                {selectedElder.first_name} {selectedElder.last_name}
              </Text>
              {selectedElder.zip_code && (
                <Text style={styles.dropdownSelectedZip}>{selectedElder.zip_code}</Text>
              )}
              <Pressable
                onPress={(e) => { e.stopPropagation(); handleClearElder(); }}
                hitSlop={8}
                style={styles.dropdownClearButton}
              >
                <CloseIcon size={16} color={colors.text.secondary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.dropdownPlaceholderRow}>
              <Text style={styles.dropdownPlaceholder}>Choose an elder...</Text>
              <ChevronDownIcon size={20} color={colors.text.tertiary} />
            </View>
          )}
        </Pressable>

        {/* Dropdown Modal */}
        <Modal
          visible={showElderDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowElderDropdown(false)}
        >
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => setShowElderDropdown(false)}
          >
            <View style={styles.dropdownMenu}>
              <Text style={styles.dropdownMenuTitle}>Select an Elder</Text>
              <FlatList
                data={elders}
                keyExtractor={(item) => item.id}
                style={styles.dropdownList}
                ItemSeparatorComponent={() => <View style={styles.dropdownSeparator} />}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.dropdownItem,
                      item.id === selectedElderId && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      handleSelectElder(item);
                      setShowElderDropdown(false);
                    }}
                  >
                    <ElderIcon
                      size={20}
                      color={item.id === selectedElderId ? colors.primary[700] : colors.text.secondary}
                    />
                    <View style={styles.dropdownItemContent}>
                      <Text
                        style={[
                          styles.dropdownItemName,
                          item.id === selectedElderId && styles.dropdownItemNameActive,
                        ]}
                      >
                        {item.first_name} {item.last_name}
                      </Text>
                      {item.zip_code && (
                        <Text style={styles.dropdownItemZip}>{item.zip_code}</Text>
                      )}
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.dropdownEmpty}>No active elders</Text>
                }
              />
            </View>
          </Pressable>
        </Modal>
      </View>

      {/* Filter Toggle */}
      <View style={styles.filterToggleContainer}>
        <Pressable
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <FilterIcon size={20} color={showFilters ? colors.success[600] : colors.text.secondary} />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filters
          </Text>
        </Pressable>
      </View>

      {/* Filters Section */}
      {showFilters && (
        <View style={styles.filtersSection}>
          {/* Zip Code Input */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Zip Code</Text>
            <TextInput
              style={styles.zipCodeInput}
              placeholder="Enter zip code"
              placeholderTextColor={colors.text.tertiary}
              value={filters.zipCode}
              onChangeText={(text) =>
                setFilters({ ...filters, zipCode: text.replace(/\D/g, '').slice(0, 5) })
              }
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          {/* Elder Care Needs (only when elder selected) */}
          {selectedElder && elderTasks.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Care Needs</Text>
              <View style={styles.careNeedsRow}>
                {elderTasks.map((task) => (
                  <View key={task.task_id} style={styles.careNeedChip}>
                    <Text style={styles.careNeedText}>
                      {task.task_library?.name || 'Unknown'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Availability Toggles */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Availability</Text>
            <View style={styles.togglesRow}>
              {['Morning', 'Afternoon', 'Evening'].map((time) => {
                const key = `${time.toLowerCase()}Available` as keyof FilterState;
                return (
                  <Pressable
                    key={time}
                    style={[
                      styles.toggleChip,
                      filters[key] && styles.toggleChipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, [key]: !filters[key] })}
                  >
                    <Text
                      style={[
                        styles.toggleChipText,
                        filters[key] && styles.toggleChipTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Max Rate Input */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Max Rate</Text>
            <View style={styles.rateInputContainer}>
              <Text style={styles.rateCurrency}>$</Text>
              <TextInput
                style={styles.rateInput}
                placeholder="e.g., 30"
                placeholderTextColor={colors.text.tertiary}
                value={filters.maxRate}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0, 3);
                  setFilters({ ...filters, maxRate: digits });
                  if (rateError) setRateError('');
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.rateUnit}>/hr</Text>
            </View>
            {rateError ? <Text style={styles.rateErrorText}>{rateError}</Text> : null}
          </View>

          {/* Search Button */}
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={roleColors.agency_owner} />
          <Text style={styles.loadingText}>Searching caregivers...</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateTitle}>Get Started</Text>
          <Text style={styles.emptyStateText}>
            {selectedElder
              ? `Use the filters above to find caregivers for ${selectedElder.first_name}`
              : 'Select an elder or use the filters above to find caregivers'}
          </Text>
        </View>
      ) : caregivers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateTitle}>No Caregivers Found</Text>
          <Text style={styles.emptyStateText}>
            Try adjusting your zip code or expanding your filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={caregivers}
          renderItem={renderCaregiverCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            selectedElder ? (
              <Text style={styles.resultsHeader}>
                Top {caregivers.length} match{caregivers.length !== 1 ? 'es' : ''} for {selectedElder.first_name} {selectedElder.last_name}
              </Text>
            ) : null
          }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },

  // Elder Picker
  elderPickerSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  elderPickerLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    fontWeight: '500',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.background,
  },
  dropdownTriggerActive: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  dropdownPlaceholderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPlaceholder: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  dropdownSelectedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dropdownSelectedText: {
    ...typography.styles.body,
    color: colors.primary[700],
    fontWeight: '600',
    flex: 1,
  },
  dropdownSelectedZip: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  dropdownClearButton: {
    padding: spacing[1],
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: 400,
    overflow: 'hidden',
  },
  dropdownMenuTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  dropdownList: {
    maxHeight: 340,
  },
  dropdownSeparator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginHorizontal: spacing[4],
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  dropdownItemActive: {
    backgroundColor: colors.primary[50],
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  dropdownItemNameActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  dropdownItemZip: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  dropdownEmpty: {
    ...typography.styles.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    padding: spacing[4],
    fontStyle: 'italic',
  },

  // Filters
  filterToggleContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  filterToggleActive: {
    borderColor: colors.success[600],
    backgroundColor: colors.success[50],
  },
  filterToggleText: {
    ...typography.styles.label,
    color: colors.text.secondary,
  },
  filterToggleTextActive: {
    color: colors.success[600],
    fontWeight: '600',
  },
  filtersSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  filterGroup: {
    marginBottom: spacing[4],
  },
  filterLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
    fontWeight: '600',
  },
  zipCodeInput: {
    ...typography.styles.body,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  careNeedsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  careNeedChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  careNeedText: {
    ...typography.styles.caption,
    color: colors.primary[700],
    fontWeight: '500',
  },
  togglesRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  toggleChip: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  toggleChipActive: {
    borderColor: colors.success[600],
    backgroundColor: colors.success[50],
  },
  toggleChipText: {
    ...typography.styles.label,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  toggleChipTextActive: {
    color: colors.success[600],
    fontWeight: '600',
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
  },
  rateCurrency: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  rateInput: {
    flex: 1,
    ...typography.styles.body,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    color: colors.text.primary,
  },
  rateUnit: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  rateErrorText: {
    ...typography.styles.caption,
    color: colors.error[500],
    marginTop: spacing[1],
  },
  searchButton: {
    backgroundColor: colors.success[600],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },

  // Results
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  emptyStateTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyStateText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  resultsHeader: {
    ...typography.styles.label,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  separator: {
    height: spacing[3],
  },
  caregiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing[3],
  },
  avatarSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: roleColors.caregiver,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
  contentSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  caregiverName: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  locationRate: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  capabilitiesRow: {
    flexDirection: 'row',
    gap: spacing[1],
    flexWrap: 'wrap',
  },
  capabilityChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success[600],
  },
  capabilityText: {
    ...typography.styles.caption,
    color: colors.success[600],
    fontWeight: '500',
    fontSize: 11,
  },
  ratingRow: {
    marginTop: spacing[2],
  },
});
