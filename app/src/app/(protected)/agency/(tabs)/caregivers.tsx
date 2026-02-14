// HealthGuide Caregiver Management
// Per healthguide-agency/caregiver-mgmt skill

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { PersonIcon, PlusIcon, PhoneIcon, CheckIcon, SearchIcon } from '@/components/icons';

const MAX_CAREGIVERS = 15;

interface Caregiver {
  id: string;
  full_name: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  is_licensed: boolean;
  avatar_url?: string;
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

  useFocusEffect(
    useCallback(() => {
      fetchCaregivers();
    }, [])
  );

  async function fetchCaregivers() {
    if (!user?.agency_id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get caregivers for this agency
      const { data: caregiversData, error } = await supabase
        .from('caregivers')
        .select(`
          id,
          full_name,
          phone,
          status,
          is_licensed,
          avatar_url,
          user:user_profiles!user_id (first_name, last_name)
        `)
        .eq('agency_id', user.agency_id)
        .order('full_name');

      if (error) throw error;

      if (caregiversData) {
        // Get today's visits for all caregivers
        const { data: visitsData } = await supabase
          .from('visits')
          .select('caregiver_id, status')
          .eq('agency_id', user.agency_id)
          .eq('scheduled_date', today);

        // Map caregivers with computed stats
        const caregiversWithStats = caregiversData.map((c: any) => {
          const caregiverVisits = visitsData?.filter(v => v.caregiver_id === c.id) || [];
          const userProfile = Array.isArray(c.user) ? c.user[0] : c.user;

          return {
            id: c.id,
            full_name: c.full_name || (userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown'),
            phone: c.phone || '',
            status: c.status || 'pending',
            is_licensed: c.is_licensed || false,
            avatar_url: c.avatar_url,
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
    if (caregivers.length >= MAX_CAREGIVERS) {
      Alert.alert(
        'Limit Reached',
        `You can have up to ${MAX_CAREGIVERS} caregivers per agency.`
      );
      return;
    }
    router.push('/(protected)/agency/caregiver/new');
  }

  const filteredCaregivers = caregivers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const renderCaregiver = ({ item }: { item: Caregiver }) => {
    const statusColors = {
      active: colors.success[500],
      inactive: colors.error[500],
      pending: colors.warning[500],
    };

    return (
      <Card
        variant="default"
        padding="md"
        onPress={() => router.push(`/(protected)/agency/caregiver/${item.id}`)}
        style={styles.caregiverCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <PersonIcon size={32} color={roleColors.caregiver} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.caregiverName}>{item.full_name}</Text>
            <View style={styles.phoneRow}>
              <PhoneIcon size={14} color={colors.text.secondary} />
              <Text style={styles.phoneText}>{item.phone}</Text>
            </View>
            {item.is_licensed && (
              <View style={styles.licenseBadge}>
                <CheckIcon size={12} color={colors.success[500]} />
                <Text style={styles.licenseText}>Licensed</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColors[item.status] },
            ]}
          />
        </View>
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
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {caregivers.length} / {MAX_CAREGIVERS} Caregivers
        </Text>
        <Button
          title="+ Add"
          variant="primary"
          size="sm"
          onPress={handleAddCaregiver}
          disabled={caregivers.length >= MAX_CAREGIVERS}
        />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search caregivers..."
          placeholderTextColor={colors.text.secondary}
        />
      </View>

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
            <Text style={styles.emptyEmoji}>
              {loading ? '' : ''}
            </Text>
            <Text style={styles.emptyText}>
              {loading ? 'Loading caregivers...' : 'No caregivers yet'}
            </Text>
            {!loading && (
              <Text style={styles.emptySubtext}>
                Add your first caregiver to get started
              </Text>
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    ...typography.styles.body,
    color: colors.text.primary,
  },
  list: {
    padding: spacing[4],
  },
  separator: {
    height: spacing[3],
  },
  caregiverCard: {
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 16,
    marginBottom: spacing[1],
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
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[1],
  },
  licenseText: {
    fontSize: 12,
    color: colors.success[500],
    fontWeight: '500',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardStats: {
    flexDirection: 'row',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
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
  emptyEmoji: {
    fontSize: 48,
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
