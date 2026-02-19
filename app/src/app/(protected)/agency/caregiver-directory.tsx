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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  AlertIcon,
} from '@/components/icons';
import { RatingSummary } from '@/components/caregiver/RatingSummary';

const DISCLAIMER_ACCEPTED_KEY = 'healthguide_directory_disclaimer_accepted';

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

const ALL_SERVICES = [
  'Companionship', 'Grocery Shopping & Errands', 'House Cleaning', 'Laundry',
  'Lawn & Yard Care', 'Meal Preparation', 'Mobility Assistance', 'Nanny / Childcare',
  'Personal Care', 'Pet Care', 'Tech Help', 'Transportation & Driving', 'Tutoring',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MAP: Record<string, string> = {
  Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday',
  Fri: 'friday', Sat: 'saturday', Sun: 'sunday',
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
  { label: 'Overnight', value: '10pm-6am' },
];

interface FilterState {
  zipCode: string;
  selectedDays: string[];       // e.g. ['Mon', 'Wed']
  selectedTimeSlots: string[];  // e.g. ['6am-8am', '8am-10am']
  selectedServices: string[];   // e.g. ['Meal Preparation', 'Personal Care']
  maxRate: string;
}

export default function CaregiverDirectoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [filters, setFilters] = useState<FilterState>({
    zipCode: '',
    selectedDays: [],
    selectedTimeSlots: [],
    selectedServices: [],
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

  // Services dropdown state
  const [showServicesPicker, setShowServicesPicker] = useState(false);

  // Disclaimer modal state
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Check disclaimer acceptance on mount
  useEffect(() => {
    (async () => {
      const accepted = await AsyncStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
      if (accepted !== 'true') {
        setShowDisclaimer(true);
      }
    })();
  }, []);

  const handleAcceptDisclaimer = async () => {
    await AsyncStorage.setItem(DISCLAIMER_ACCEPTED_KEY, 'true');
    setShowDisclaimer(false);
  };

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
      if (data) setElderTasks(data as unknown as ElderTask[]);
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

  /** Toggle a value in an array (add if missing, remove if present) */
  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];

  /** Client-side: filter by availability (days + time slots) */
  const filterByAvailability = (results: CaregiverResult[]): CaregiverResult[] => {
    const { selectedDays, selectedTimeSlots } = filters;
    if (selectedDays.length === 0 && selectedTimeSlots.length === 0) return results;

    return results.filter((cg) => {
      if (!cg.availability) return false;
      // For each selected day, check if the caregiver has at least one selected time slot
      const daysToCheck = selectedDays.length > 0
        ? selectedDays.map((d) => DAY_MAP[d])
        : Object.keys(cg.availability);
      const slotsToMatch = selectedTimeSlots.length > 0 ? selectedTimeSlots : null;

      return daysToCheck.some((dayKey) => {
        const daySlots = cg.availability![dayKey] || [];
        if (!slotsToMatch) return daySlots.length > 0; // any availability on that day
        return slotsToMatch.some((slot) => daySlots.includes(slot));
      });
    });
  };

  /** Client-side: filter by services/capabilities */
  const filterByServices = (results: CaregiverResult[]): CaregiverResult[] => {
    if (filters.selectedServices.length === 0) return results;
    return results.filter((cg) =>
      filters.selectedServices.some((svc) =>
        cg.capabilities.some((cap) => cap.toLowerCase().includes(svc.toLowerCase()))
      )
    );
  };

  const handleSearch = async () => {
    if (filters.maxRate.trim()) {
      const rate = parseFloat(filters.maxRate);
      if (rate < 10 || rate > 50) {
        setRateError('Enter a rate between $10 and $50');
        return;
      }
    }
    setRateError('');
    setLoading(true);
    setHasSearched(true);
    setShowFilters(false);

    try {
      const zipPrefix = filters.zipCode.trim() ? filters.zipCode.trim().substring(0, 3) : null;
      const maxRate = filters.maxRate.trim() ? parseFloat(filters.maxRate) : null;

      let query = supabase
        .from('caregiver_profiles')
        .select(
          'id, full_name, photo_url, zip_code, hourly_rate_min, hourly_rate_max, npi_verified, capabilities, availability, bio, rating_count, positive_count',
          { count: 'exact' }
        )
        .eq('is_active', true);

      if (zipPrefix) {
        query = query.ilike('zip_code', `${zipPrefix}%`);
      }

      if (maxRate !== null) {
        query = query.or(`hourly_rate_min.lte.${maxRate},hourly_rate_min.is.null`);
      }

      const { data, error } = await query
        .order('npi_verified', { ascending: false })
        .order('positive_count', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      const results: CaregiverResult[] = (data || []).map((cg: any) => ({
        ...cg,
        bio: cg.bio ? cg.bio.substring(0, 200) : null,
        capabilities: Array.isArray(cg.capabilities) ? cg.capabilities : [],
      }));

      const filtered = filterByServices(filterByAvailability(results));
      setCaregivers(selectedElderId ? filtered.slice(0, 3) : filtered);
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

      {/* Elder Picker — hidden when filters are expanded */}
      {!showFilters && (
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
        </View>
      )}

      {/* Elder Dropdown Modal — always available */}
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

      {/* Filter Toggle + compact elder chip when filters open */}
      <View style={styles.filterToggleContainer}>
        <View style={styles.filterToggleRow}>
          <Pressable
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FilterIcon size={20} color={showFilters ? colors.success[600] : colors.text.secondary} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              Filters
            </Text>
          </Pressable>

          {/* Show compact elder chip when filters are expanded */}
          {showFilters && selectedElder && (
            <View style={styles.compactElderChip}>
              <ElderIcon size={14} color={colors.primary[700]} />
              <Text style={styles.compactElderText} numberOfLines={1}>
                {selectedElder.first_name} {selectedElder.last_name}
              </Text>
              <Pressable onPress={handleClearElder} hitSlop={8}>
                <CloseIcon size={14} color={colors.text.secondary} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Filters Section — scrollable */}
      {showFilters && (
        <ScrollView
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersSection}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Row: Zip + Rate side by side */}
          <View style={styles.filterRow}>
            <View style={[styles.filterGroup, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Zip Code</Text>
              <TextInput
                style={styles.zipCodeInput}
                placeholder="e.g. 28201"
                placeholderTextColor={colors.text.tertiary}
                value={filters.zipCode}
                onChangeText={(text) =>
                  setFilters({ ...filters, zipCode: text.replace(/\D/g, '').slice(0, 5) })
                }
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={[styles.filterGroup, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Max Rate</Text>
              <View style={styles.rateInputContainer}>
                <Text style={styles.rateCurrency}>$</Text>
                <TextInput
                  style={styles.rateInput}
                  placeholder="10–50"
                  placeholderTextColor={colors.text.tertiary}
                  value={filters.maxRate}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '').slice(0, 2);
                    setFilters({ ...filters, maxRate: digits });
                    if (rateError) setRateError('');
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.rateUnit}>/hr</Text>
              </View>
              {rateError ? <Text style={styles.rateErrorText}>{rateError}</Text> : null}
            </View>
          </View>

          {/* Services — dropdown picker (max 3) */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>
              Services Needed{filters.selectedServices.length > 0 ? ` (${filters.selectedServices.length}/3)` : ''}
            </Text>
            <Pressable
              style={styles.servicesDropdownTrigger}
              onPress={() => setShowServicesPicker(true)}
            >
              {filters.selectedServices.length > 0 ? (
                <View style={styles.selectedChipsRow}>
                  {filters.selectedServices.map((svc) => (
                    <View key={svc} style={styles.selectedChipInline}>
                      <Text style={styles.selectedChipText}>{svc}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation();
                          setFilters({ ...filters, selectedServices: filters.selectedServices.filter((s) => s !== svc) });
                        }}
                      >
                        <Text style={styles.selectedChipX}>{'\u00D7'}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.servicesPlaceholder}>Select up to 3 services</Text>
              )}
              <ChevronDownIcon size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>

          {/* Schedule — Days + Times in one card */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Schedule</Text>
            <View style={styles.scheduleCard}>
              {/* Days row */}
              <View style={styles.scheduleDaysRow}>
                {DAYS.map((day) => {
                  const active = filters.selectedDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      style={[styles.schedDayBtn, active && styles.schedDayBtnActive]}
                      onPress={() => setFilters({ ...filters, selectedDays: toggleArrayItem(filters.selectedDays, day) })}
                    >
                      <Text style={[styles.schedDayText, active && styles.schedDayTextActive]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {/* Divider */}
              <View style={styles.scheduleDivider} />
              {/* Time slots — 2 rows of 4 */}
              <View style={styles.schedTimesGrid}>
                {TIME_SLOTS.map((slot) => {
                  const active = filters.selectedTimeSlots.includes(slot.value);
                  return (
                    <Pressable
                      key={slot.value}
                      style={[styles.schedTimeBtn, active && styles.schedTimeBtnActive]}
                      onPress={() => setFilters({ ...filters, selectedTimeSlots: toggleArrayItem(filters.selectedTimeSlots, slot.value) })}
                    >
                      <Text style={[styles.schedTimeText, active && styles.schedTimeTextActive]}>
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Search Button */}
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search Caregivers</Text>
          </Pressable>
        </ScrollView>
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

      {/* Disclaimer Modal — must accept before using directory */}
      <Modal
        visible={showDisclaimer}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.disclaimerOverlay}>
          <View style={styles.disclaimerModal}>
            <View style={styles.disclaimerIconRow}>
              <AlertIcon size={28} color={colors.warning[600]} />
            </View>
            <Text style={styles.disclaimerTitle}>Important Notice</Text>

            <ScrollView style={styles.disclaimerScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.disclaimerBody}>
                HealthGuide is a discovery platform only. It connects agencies and families with independent caregivers for <Text style={styles.disclaimerBold}>non-medical, non-critical services</Text>. By using this directory, you acknowledge and agree to the following:
              </Text>

              <Text style={styles.disclaimerSectionHeader}>No Verification or Endorsement</Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} HealthGuide does <Text style={styles.disclaimerBold}>not</Text> verify, validate, or endorse any caregiver's identity, skills, certifications, qualifications, or background.
              </Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} All caregiver profiles are self-reported. Ratings and reviews are submitted by other users and are not independently verified.
              </Text>

              <Text style={styles.disclaimerSectionHeader}>Your Responsibility</Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} It is the <Text style={styles.disclaimerBold}>sole responsibility of the agency and the family</Text> to conduct background checks, credential verification, reference checks, and any other due diligence before engaging any caregiver.
              </Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} All caregivers must be <Text style={styles.disclaimerBold}>18 years of age or older</Text>. Agencies must independently verify a caregiver's age and legal right to work.
              </Text>

              <Text style={styles.disclaimerSectionHeader}>Independent Contractors</Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} Caregivers found through HealthGuide are <Text style={styles.disclaimerBold}>independent contractors</Text>, not employees or agents of HealthGuide. HealthGuide does not employ, supervise, or control caregivers.
              </Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} HealthGuide does not provide insurance, bonding, or workers' compensation coverage for caregivers. Agencies are responsible for arranging appropriate coverage.
              </Text>

              <Text style={styles.disclaimerSectionHeader}>Non-Medical Services Only</Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} This platform is intended for <Text style={styles.disclaimerBold}>non-medical, non-critical services only</Text> (companionship, errands, housekeeping, transportation, etc.). HealthGuide must not be used to find caregivers for medical, nursing, or clinical care.
              </Text>

              <Text style={styles.disclaimerSectionHeader}>Limitation of Liability</Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} HealthGuide assumes <Text style={styles.disclaimerBold}>no liability</Text> for any injury, loss, damage, theft, dispute, or claim arising from the engagement of any caregiver found through this platform.
              </Text>
              <Text style={styles.disclaimerBullet}>
                {'\u2022'} By proceeding, you agree to <Text style={styles.disclaimerBold}>hold harmless</Text> HealthGuide, its owners, and affiliates from any and all claims related to caregiver engagements.
              </Text>
            </ScrollView>

            <Pressable
              style={[styles.disclaimerCheckRow]}
              onPress={() => setDisclaimerChecked(!disclaimerChecked)}
            >
              <View style={[styles.disclaimerCheckbox, disclaimerChecked && styles.disclaimerCheckboxChecked]}>
                {disclaimerChecked && <Text style={styles.disclaimerCheckmark}>{'\u2713'}</Text>}
              </View>
              <Text style={styles.disclaimerCheckLabel}>
                I understand and agree to the above terms
              </Text>
            </Pressable>

            <Pressable
              style={[styles.disclaimerAcceptButton, !disclaimerChecked && styles.disclaimerAcceptButtonDisabled]}
              onPress={disclaimerChecked ? handleAcceptDisclaimer : undefined}
              disabled={!disclaimerChecked}
            >
              <Text style={[styles.disclaimerAcceptText, !disclaimerChecked && styles.disclaimerAcceptTextDisabled]}>
                Accept & Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Services Picker Modal */}
      <Modal
        visible={showServicesPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServicesPicker(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowServicesPicker(false)}
        >
          <View style={styles.servicesPickerModal}>
            <Text style={styles.servicesPickerTitle}>
              Select Services ({filters.selectedServices.length}/3)
            </Text>
            <FlatList
              data={ALL_SERVICES}
              keyExtractor={(item) => item}
              style={styles.servicesPickerList}
              ItemSeparatorComponent={() => <View style={styles.dropdownSeparator} />}
              renderItem={({ item }) => {
                const selected = filters.selectedServices.includes(item);
                const atMax = filters.selectedServices.length >= 3 && !selected;
                return (
                  <Pressable
                    style={[
                      styles.servicesPickerItem,
                      selected && styles.servicesPickerItemSelected,
                      atMax && styles.servicesPickerItemDisabled,
                    ]}
                    onPress={() => {
                      if (atMax) return;
                      setFilters({
                        ...filters,
                        selectedServices: selected
                          ? filters.selectedServices.filter((s) => s !== item)
                          : [...filters.selectedServices, item],
                      });
                    }}
                  >
                    <View style={[styles.servicesCheckbox, selected && styles.servicesCheckboxChecked]}>
                      {selected && <Text style={styles.servicesCheckmark}>{'\u2713'}</Text>}
                    </View>
                    <Text style={[
                      styles.servicesPickerText,
                      selected && styles.servicesPickerTextSelected,
                      atMax && styles.servicesPickerTextDisabled,
                    ]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <Pressable
              style={styles.servicesPickerDone}
              onPress={() => setShowServicesPicker(false)}
            >
              <Text style={styles.servicesPickerDoneText}>Done</Text>
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
    paddingVertical: spacing[2],
  },
  filterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  compactElderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  compactElderText: {
    ...typography.styles.caption,
    color: colors.primary[700],
    fontWeight: '600',
    flex: 1,
    fontSize: 12,
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
  filtersScroll: {
    flex: 1,
  },
  filtersSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  filterGroup: {
    marginBottom: spacing[3],
  },
  filterLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // Services dropdown
  servicesDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.background,
    minHeight: 48,
  },
  servicesPlaceholder: {
    ...typography.styles.body,
    color: colors.text.tertiary,
    flex: 1,
  },
  selectedChipsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  selectedChipInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: spacing[2],
    paddingRight: spacing[1],
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[300],
  },
  selectedChipText: {
    ...typography.styles.caption,
    color: colors.success[700],
    fontWeight: '600',
  },
  selectedChipX: {
    color: colors.success[500],
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  // Services picker modal
  servicesPickerModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: 480,
    overflow: 'hidden',
  },
  servicesPickerTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  servicesPickerList: {
    maxHeight: 360,
  },
  servicesPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  servicesPickerItemSelected: {
    backgroundColor: colors.success[50],
  },
  servicesPickerItemDisabled: {
    opacity: 0.4,
  },
  servicesCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  servicesCheckboxChecked: {
    backgroundColor: colors.success[600],
    borderColor: colors.success[600],
  },
  servicesCheckmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  servicesPickerText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  servicesPickerTextSelected: {
    color: colors.success[700],
    fontWeight: '600',
  },
  servicesPickerTextDisabled: {
    color: colors.text.tertiary,
  },
  servicesPickerDone: {
    backgroundColor: colors.success[600],
    paddingVertical: spacing[3],
    margin: spacing[4],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  servicesPickerDoneText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '700',
  },
  // Schedule card
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing[3],
  },
  scheduleDaysRow: {
    flexDirection: 'row',
    gap: 4,
  },
  schedDayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
  },
  schedDayBtnActive: {
    backgroundColor: colors.success[600],
  },
  schedDayText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  schedDayTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[3],
  },
  schedTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  schedTimeBtn: {
    width: '23%' as any,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
  },
  schedTimeBtnActive: {
    backgroundColor: colors.success[600],
  },
  schedTimeText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  schedTimeTextActive: {
    color: colors.white,
    fontWeight: '700',
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
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
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

  // Disclaimer modal
  disclaimerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  disclaimerModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    maxHeight: '85%',
  },
  disclaimerIconRow: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  disclaimerTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  disclaimerScroll: {
    maxHeight: 280,
    marginBottom: spacing[4],
  },
  disclaimerBody: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  disclaimerSectionHeader: {
    ...typography.styles.caption,
    color: colors.text.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  disclaimerBullet: {
    ...typography.styles.body,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: spacing[3],
    paddingLeft: spacing[2],
  },
  disclaimerBold: {
    fontWeight: '700',
  },
  disclaimerCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
  },
  disclaimerCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  disclaimerCheckboxChecked: {
    backgroundColor: colors.success[600],
    borderColor: colors.success[600],
  },
  disclaimerCheckmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  disclaimerCheckLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
    fontWeight: '500',
  },
  disclaimerAcceptButton: {
    backgroundColor: colors.success[600],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerAcceptButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  disclaimerAcceptText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
  disclaimerAcceptTextDisabled: {
    color: colors.text.tertiary,
  },
});
