// HealthGuide Caregiver Support Groups List
// Per healthguide-community/caregiver-support skill

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
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CommunityIcon, SearchIcon, CheckIcon } from '@/components/icons';

interface SupportGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
  is_joined: boolean;
  last_activity: string;
  is_private: boolean;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'wellness', label: 'Wellness' },
  { key: 'specialty', label: 'Specialty Care' },
  { key: 'local', label: 'Local' },
  { key: 'skills', label: 'Skills' },
];

export default function SupportGroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  async function fetchGroups() {
    if (!user?.id) return;

    try {
      // Fetch all groups with member counts
      const { data: groupsData, error } = await supabase
        .from('support_groups')
        .select(`
          id,
          name,
          description,
          category,
          is_private,
          last_activity,
          group_members (id, user_id)
        `)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      if (groupsData) {
        const formattedGroups = groupsData.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          category: g.category || 'general',
          member_count: Array.isArray(g.group_members) ? g.group_members.length : 0,
          is_joined: Array.isArray(g.group_members)
            ? g.group_members.some((m: any) => m.user_id === user.id)
            : false,
          last_activity: g.last_activity || new Date().toISOString(),
          is_private: g.is_private || false,
        }));

        setGroups(formattedGroups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Use mock data if no DB table yet
      setGroups([
        {
          id: '1',
          name: 'New Caregiver Support',
          description: 'A safe space for caregivers in their first year of caregiving. Ask questions, share experiences, and get encouragement.',
          category: 'wellness',
          member_count: 24,
          is_joined: false,
          last_activity: new Date().toISOString(),
          is_private: false,
        },
        {
          id: '2',
          name: 'Self-Care Corner',
          description: 'Tips and strategies for maintaining your own wellness while caring for others. Remember: you cannot pour from an empty cup.',
          category: 'wellness',
          member_count: 156,
          is_joined: true,
          last_activity: new Date().toISOString(),
          is_private: false,
        },
        {
          id: '3',
          name: 'Dementia Care Specialists',
          description: 'Support and strategies for those caring for people with dementia or Alzheimer\'s. Share what works and get advice.',
          category: 'specialty',
          member_count: 89,
          is_joined: false,
          last_activity: new Date().toISOString(),
          is_private: false,
        },
        {
          id: '4',
          name: 'Mobility & Physical Care',
          description: 'Discussions about safe lifting, transfers, physical therapy support, and mobility assistance techniques.',
          category: 'skills',
          member_count: 67,
          is_joined: false,
          last_activity: new Date().toISOString(),
          is_private: false,
        },
        {
          id: '5',
          name: 'Night Shift Caregivers',
          description: 'For those who work evening and overnight shifts. Share tips for staying alert and managing unique challenges.',
          category: 'specialty',
          member_count: 42,
          is_joined: true,
          last_activity: new Date().toISOString(),
          is_private: false,
        },
      ]);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }

  async function handleJoinGroup(groupId: string) {
    // Optimistic update
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, is_joined: true, member_count: g.member_count + 1 }
          : g
      )
    );

    try {
      await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user?.id,
        role: 'member',
      });
    } catch (error) {
      console.error('Error joining group:', error);
      // Revert on error
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, is_joined: false, member_count: g.member_count - 1 }
            : g
        )
      );
    }
  }

  function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderGroup = ({ item }: { item: SupportGroup }) => (
    <Card
      variant="default"
      padding="md"
      onPress={() => router.push(`/(protected)/caregiver/community/groups/${item.id}`)}
      style={styles.groupCard}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <CommunityIcon size={24} color={roleColors.caregiver} />
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupTitleRow}>
            <Text style={styles.groupName}>{item.name}</Text>
            {item.is_private && (
              <Badge label="Private" variant="neutral" size="sm" />
            )}
          </View>
          <Text style={styles.groupMeta}>
            {item.member_count} members • Active {getTimeAgo(item.last_activity)}
          </Text>
        </View>
      </View>

      <Text style={styles.groupDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.groupFooter}>
        {item.is_joined ? (
          <View style={styles.joinedBadge}>
            <CheckIcon size={14} color={colors.success[600]} />
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        ) : (
          <Button
            title="Join Group"
            variant="outline"
            size="sm"
            onPress={() => handleJoinGroup(item.id)}
          />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Support Groups',
          headerBackTitle: 'Back',
        }}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search groups..."
          placeholderTextColor={colors.text.secondary}
        />
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.categoryChip,
                selectedCategory === item.key && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item.key && styles.categoryTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Groups List */}
      <FlatList
        data={filteredGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>
              {loading ? 'Loading groups...' : 'No groups found'}
            </Text>
            {!loading && search && (
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    ...typography.caregiver.body,
    color: colors.text.primary,
  },
  categoriesContainer: {
    marginVertical: spacing[3],
  },
  categoriesList: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  categoryChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    marginRight: spacing[2],
  },
  categoryChipSelected: {
    backgroundColor: roleColors.caregiver,
  },
  categoryText: {
    ...typography.styles.label,
    color: colors.text.secondary,
  },
  categoryTextSelected: {
    color: colors.white,
  },
  list: {
    padding: spacing[4],
    paddingTop: 0,
  },
  groupCard: {
    marginBottom: spacing[3],
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  groupInfo: {
    flex: 1,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  groupName: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  groupMeta: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  groupDescription: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.success[50],
    borderRadius: borderRadius.md,
  },
  joinedText: {
    ...typography.styles.caption,
    color: colors.success[600],
    fontWeight: '600',
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
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
});
