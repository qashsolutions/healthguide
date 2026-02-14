// HealthGuide Caregiver Directory
// Searchable marketplace for agency owners to find caregivers

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  FilterIcon,
} from '@/components/icons';
import { RatingSummary } from '@/components/caregiver/RatingSummary';

interface CaregiverResult {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  zip_code: string;
  hourly_rate?: number;
  npi_verified: boolean;
  capabilities: string[];
  rating_count?: number;
  positive_count?: number;
}

interface FilterState {
  zipCode: string;
  morningAvailable: boolean;
  afternoonAvailable: boolean;
  eveningAvailable: boolean;
  verifiedOnly: boolean;
  maxRate: string;
}

export default function CaregiverDirectoryScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    zipCode: '',
    morningAvailable: false,
    afternoonAvailable: false,
    eveningAvailable: false,
    verifiedOnly: false,
    maxRate: '',
  });

  const [caregivers, setCaregivers] = useState<CaregiverResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const filterPayload: any = {};

      if (filters.zipCode.trim()) {
        filterPayload.zip_code = filters.zipCode.trim();
      }

      if (filters.verifiedOnly) {
        filterPayload.npi_verified = true;
      }

      if (filters.maxRate.trim()) {
        filterPayload.max_rate = parseFloat(filters.maxRate);
      }

      const availability = [];
      if (filters.morningAvailable) availability.push('morning');
      if (filters.afternoonAvailable) availability.push('afternoon');
      if (filters.eveningAvailable) availability.push('evening');

      if (availability.length > 0) {
        filterPayload.availability = availability;
      }

      const { data, error } = await supabase.functions.invoke(
        'search-caregivers',
        {
          body: filterPayload,
        }
      );

      if (error) throw error;

      setCaregivers(data || []);
    } catch (error) {
      console.error('Error searching caregivers:', error);
      setCaregivers([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const renderCaregiverCard = ({ item }: { item: CaregiverResult }) => {
    const rateDisplay = item.hourly_rate ? `$${item.hourly_rate}/hr` : 'Rate not specified';

    return (
      <Pressable
        style={styles.caregiverCard}
        onPress={() =>
          router.push(`/(protected)/agency/caregiver-profile-view?id=${item.profile_id}` as any)
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
                {getInitials(item.first_name, item.last_name)}
              </Text>
            </View>
          )}
        </View>

        {/* Center Content */}
        <View style={styles.contentSection}>
          {/* Name + Badge Row */}
          <View style={styles.nameRow}>
            <Text style={styles.caregiverName}>
              {item.first_name} {item.last_name}
            </Text>
            {item.npi_verified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheckIcon size={12} color={colors.success[500]} />
              </View>
            )}
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
        <Pressable onPress={() => router.back()}>
          <ChevronLeftIcon size={28} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Find Caregivers</Text>
        <View style={{ width: 28 }} />
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

          {/* Verified Only Toggle */}
          <View style={styles.filterGroup}>
            <View style={styles.verifiedToggleRow}>
              <Text style={styles.filterLabel}>Verified Only</Text>
              <Switch
                value={filters.verifiedOnly}
                onValueChange={(value) =>
                  setFilters({ ...filters, verifiedOnly: value })
                }
                trackColor={{ false: colors.neutral[200], true: colors.success[300] }}
                thumbColor={filters.verifiedOnly ? colors.success[600] : colors.neutral[400]}
              />
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
                onChangeText={(text) =>
                  setFilters({ ...filters, maxRate: text.replace(/\D/g, '') })
                }
                keyboardType="numeric"
              />
              <Text style={styles.rateUnit}>/hr</Text>
            </View>
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
            Use the filters above to find caregivers in your area
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
  verifiedToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success[50],
    justifyContent: 'center',
    alignItems: 'center',
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
