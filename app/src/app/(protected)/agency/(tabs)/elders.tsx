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
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { PersonIcon, PlusIcon, HeartIcon, LocationIcon, SearchIcon } from '@/components/icons';

const MAX_ACTIVE_ELDERS = 20;

interface Elder {
  id: string;
  full_name: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  care_needs: string[];
  family_contacts_count: number;
}

export default function EldersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Inline toast for web-friendly feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useFocusEffect(
    useCallback(() => {
      fetchElders();
    }, [])
  );

  async function fetchElders() {
    if (!user?.agency_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: eldersData, error } = await supabase
        .from('elders')
        .select(`
          id,
          first_name,
          last_name,
          address,
          city,
          state,
          is_active,
          care_needs,
          family_members (id)
        `)
        .eq('agency_id', user.agency_id)
        .order('is_active', { ascending: false })
        .order('first_name');

      if (error) throw error;

      if (eldersData) {
        const formattedElders = eldersData.map((e: any) => ({
          id: e.id,
          full_name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown',
          address: e.address,
          city: e.city,
          state: e.state,
          is_active: e.is_active !== false,
          care_needs: e.care_needs || [],
          family_contacts_count: Array.isArray(e.family_members) ? e.family_members.length : 0,
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

  const activeElders = elders.filter((e) => e.is_active);
  const activeCount = activeElders.length;

  const filteredElders = elders.filter((e) =>
    (e.full_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const inactiveCount = elders.filter((e) => !e.is_active).length;

  async function handleToggleActive(elder: Elder) {
    const newActive = !elder.is_active;

    // If re-enabling, check the limit
    if (newActive && activeCount >= MAX_ACTIVE_ELDERS) {
      showToast(`Limit reached — max ${MAX_ACTIVE_ELDERS} active elders. Disable another first.`, 'error');
      return;
    }

    setTogglingId(elder.id);
    try {
      const { error } = await supabase
        .from('elders')
        .update({ is_active: newActive })
        .eq('id', elder.id);

      if (error) {
        showToast(error.message, 'error');
      } else {
        // Optimistic update
        setElders((prev) =>
          prev.map((e) => (e.id === elder.id ? { ...e, is_active: newActive } : e)),
        );
        if (newActive) {
          showToast(`${elder.full_name} has been re-enabled and is now visible.`, 'success');
        } else {
          showToast(`${elder.full_name} has been disabled. Their profile and data will not be visible in assignments or schedules.`, 'info');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update elder status', 'error');
    }
    setTogglingId(null);
  }

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Elder | null>(null);

  async function confirmDeleteElder() {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase
        .from('elders')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) {
        showToast(error.message, 'error');
      } else {
        const name = deleteConfirm.full_name;
        setElders((prev) => prev.filter((e) => e.id !== deleteConfirm.id));
        showToast(`${name} has been permanently deleted.`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete elder', 'error');
    }
    setDeleteConfirm(null);
  }

  const renderElder = ({ item }: { item: Elder }) => {
    const isToggling = togglingId === item.id;

    return (
      <Card
        variant="default"
        padding="md"
        onPress={() => {
          if (!item.is_active) {
            showToast(`${item.full_name} is disabled. Re-enable to view their data.`, 'info');
            return;
          }
          router.push(`/(protected)/agency/elder/${item.id}`);
        }}
        style={[styles.elderCard, !item.is_active && styles.elderCardInactive]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatarContainer, !item.is_active && styles.avatarInactive]}>
            <PersonIcon size={32} color={item.is_active ? roleColors.careseeker : colors.neutral[400]} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.elderName, !item.is_active && styles.textInactive]}>{item.full_name}</Text>
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
          <Badge
            label={item.is_active ? 'Active' : 'Inactive'}
            variant={item.is_active ? 'success' : 'neutral'}
            size="sm"
          />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <HeartIcon size={16} color={colors.error[400]} />
            <Text style={styles.detailValue}>
              {item.family_contacts_count} family contact{item.family_contacts_count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Toggle & Delete Controls — Pressable wrapper stops click from bubbling to Card onPress */}
        <Pressable
          style={styles.controls}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{item.is_active ? 'Active' : 'Disabled'}</Text>
            <Switch
              value={item.is_active}
              onValueChange={() => handleToggleActive(item)}
              disabled={isToggling}
              trackColor={{ false: colors.neutral[300], true: colors.success[400] }}
              thumbColor={item.is_active ? colors.success[600] : colors.neutral[100]}
            />
          </View>
          <Pressable
            style={styles.deleteButton}
            onPress={(e) => { e.stopPropagation(); setDeleteConfirm(item); }}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </Pressable>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.count}>
            {activeCount} Active Elders (max {MAX_ACTIVE_ELDERS})
          </Text>
          {inactiveCount > 0 && (
            <Text style={styles.pendingText}>
              {inactiveCount} inactive
            </Text>
          )}
        </View>
        <Button
          title="+ Add"
          variant="primary"
          size="sm"
          onPress={() => router.push('/(protected)/agency/elder/new')}
          disabled={activeCount >= MAX_ACTIVE_ELDERS}
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
            <View style={styles.emptyIcon}>
              <PersonIcon size={48} color={colors.neutral[300]} />
            </View>
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

      {/* Inline Toast */}
      {toast && (
        <View style={[
          styles.toastContainer,
          toast.type === 'success' && styles.toastSuccess,
          toast.type === 'error' && styles.toastError,
          toast.type === 'info' && styles.toastInfo,
        ]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade" onRequestClose={() => setDeleteConfirm(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Elder</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to permanently delete {deleteConfirm?.full_name}? This will remove all their visit history, care plans, and family connections. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setDeleteConfirm(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDelete} onPress={confirmDeleteElder}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
    paddingBottom: 100,
  },
  separator: {
    height: spacing[3],
  },
  elderCard: {
    backgroundColor: colors.surface,
  },
  elderCardInactive: {
    opacity: 0.6,
    backgroundColor: colors.neutral[50],
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
  avatarInactive: {
    backgroundColor: colors.neutral[200],
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
  textInactive: {
    color: colors.text.secondary,
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
  detailValue: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  toggleLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error[300],
    backgroundColor: colors.error[50],
  },
  deleteButtonText: {
    ...typography.styles.caption,
    color: colors.error[600],
    fontWeight: '600',
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

  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: spacing[4],
    right: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 100,
  },
  toastSuccess: {
    backgroundColor: colors.success[600],
  },
  toastError: {
    backgroundColor: colors.error[600],
  },
  toastInfo: {
    backgroundColor: colors.neutral[700],
  },
  toastText: {
    ...typography.styles.body,
    color: colors.white,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Delete confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[5],
  },
  modalTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  modalBody: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[5],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  modalCancel: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  modalCancelText: {
    ...typography.styles.label,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  modalDelete: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 8,
    backgroundColor: colors.error[600],
  },
  modalDeleteText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
});
