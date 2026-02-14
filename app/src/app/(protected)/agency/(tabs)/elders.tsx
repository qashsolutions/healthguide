// HealthGuide Elder Management
// Per healthguide-agency/careseeker-mgmt skill

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { PersonIcon, PlusIcon, HeartIcon, LocationIcon, AlertIcon, SearchIcon } from '@/components/icons';

interface Elder {
  id: string;
  full_name: string;
  preferred_name?: string;
  address: string;
  city: string;
  state: string;
  status: 'active' | 'inactive' | 'pending_handshake';
  handshake_completed: boolean;
  care_needs: string[];
  family_contacts_count: number;
  assigned_caregiver_name?: string;
}

export default function EldersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchElders();
    }, [])
  );

  async function fetchElders() {
    if (!user?.agency_id) return;

    try {
      // Get elders with family contact counts
      const { data: eldersData, error } = await supabase
        .from('elders')
        .select(`
          id,
          full_name,
          preferred_name,
          address,
          city,
          state,
          status,
          handshake_completed,
          care_needs,
          preferred_caregiver_id,
          family_members (id)
        `)
        .eq('agency_id', user.agency_id)
        .order('full_name');

      if (error) throw error;

      if (eldersData) {
        // Get assigned caregivers
        const caregiversMap: Record<string, string> = {};
        const caregiverIds = eldersData
          .filter((e: any) => e.preferred_caregiver_id)
          .map((e: any) => e.preferred_caregiver_id);

        if (caregiverIds.length > 0) {
          const { data: caregivers } = await supabase
            .from('caregivers')
            .select('id, full_name')
            .in('id', caregiverIds);

          caregivers?.forEach((c: any) => {
            caregiversMap[c.id] = c.full_name;
          });
        }

        const formattedElders = eldersData.map((e: any) => ({
          id: e.id,
          full_name: e.full_name,
          preferred_name: e.preferred_name,
          address: e.address,
          city: e.city,
          state: e.state,
          status: e.status || 'pending_handshake',
          handshake_completed: e.handshake_completed || false,
          care_needs: e.care_needs || [],
          family_contacts_count: Array.isArray(e.family_members) ? e.family_members.length : 0,
          assigned_caregiver_name: e.preferred_caregiver_id
            ? caregiversMap[e.preferred_caregiver_id]
            : undefined,
        }));

        setElders(formattedElders);
      }
    } catch (error) {
      console.error('Error fetching elders:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchElders();
    setRefreshing(false);
  }

  const filteredElders = elders.filter((e) =>
    (e.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (e.preferred_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const pendingHandshake = elders.filter((e) => !e.handshake_completed).length;

  const renderElder = ({ item }: { item: Elder }) => {
    const displayName = item.preferred_name || item.full_name;
    const statusColors = {
      active: colors.success[500],
      inactive: colors.error[500],
      pending_handshake: colors.warning[500],
    };

    return (
      <Card
        variant="default"
        padding="md"
        onPress={() => router.push(`/(protected)/agency/elder/${item.id}`)}
        style={styles.elderCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <PersonIcon size={32} color={roleColors.careseeker} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.elderName}>{displayName}</Text>
            <View style={styles.addressRow}>
              <LocationIcon size={14} color={colors.text.secondary} />
              <Text style={styles.addressText}>
                {item.city}, {item.state}
              </Text>
            </View>
            {item.care_needs && item.care_needs.length > 0 && (
              <Text style={styles.tasksText}>
                {item.care_needs.length} care task{item.care_needs.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          {!item.handshake_completed ? (
            <View style={styles.alertBadge}>
              <AlertIcon size={20} color={colors.warning[500]} />
              <Text style={styles.alertText}>Handshake</Text>
            </View>
          ) : (
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColors[item.status] },
              ]}
            />
          )}
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Caregiver:</Text>
            <Text style={styles.detailValue}>
              {item.assigned_caregiver_name || 'Not assigned'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <HeartIcon size={16} color={colors.error[400]} />
            <Text style={styles.detailValue}>
              {item.family_contacts_count} family contact{item.family_contacts_count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.count}>
            {elders.length} elders
          </Text>
          {pendingHandshake > 0 && (
            <Text style={styles.pendingText}>
              {pendingHandshake} pending handshake
            </Text>
          )}
        </View>
        <Button
          title="+ Add"
          variant="primary"
          size="sm"
          onPress={() => router.push('/(protected)/agency/elder/new')}
        />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search elders..."
          placeholderTextColor={colors.text.secondary}
        />
      </View>

      <FlatList
        data={filteredElders}
        renderItem={renderElder}
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
              {loading ? 'Loading elders...' : 'No elders yet'}
            </Text>
            {!loading && (
              <Text style={styles.emptySubtext}>
                Add your first elder to get started
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
    color: colors.text.primary,
  },
  pendingText: {
    ...typography.styles.caption,
    color: colors.warning[500],
    marginTop: 2,
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
  elderCard: {
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
    backgroundColor: roleColors.careseeker + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  cardInfo: {
    flex: 1,
  },
  elderName: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  tasksText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  alertBadge: {
    alignItems: 'center',
    gap: 4,
  },
  alertText: {
    fontSize: 10,
    color: colors.warning[500],
    fontWeight: '500',
  },
  cardDetails: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detailLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '500',
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
