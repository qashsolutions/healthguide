// HealthGuide Task Library Admin
// Per healthguide-agency/task-library skill

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Switch,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Button } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { AlertIcon, ClockIcon, CheckIcon } from '@/components/icons';
import { TaskCategory, CATEGORY_LABELS, DEFAULT_TASKS } from '@/data/defaultTasks';

interface TaskDefinition {
  id: string;
  agency_id: string;
  name: string;
  description: string;
  category: TaskCategory;
  icon_name: string;
  requires_license: boolean;
  estimated_duration_minutes?: number;
  is_active: boolean;
  sort_order: number;
}

interface SectionData {
  title: string;
  data: TaskDefinition[];
}

export default function TaskLibraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  async function fetchTasks() {
    if (!user?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('task_definitions')
        .select('*')
        .eq('agency_id', user.agency_id)
        .order('sort_order');

      if (error) throw error;

      if (data && data.length > 0) {
        setTasks(data);
      } else {
        // Initialize with default tasks if none exist
        await initializeDefaultTasks();
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }

    setLoading(false);
  }

  async function initializeDefaultTasks() {
    if (!user?.agency_id) return;

    try {
      const tasksToInsert = DEFAULT_TASKS.map((task) => ({
        ...task,
        agency_id: user.agency_id,
      }));

      const { data, error } = await supabase
        .from('task_definitions')
        .insert(tasksToInsert)
        .select();

      if (error) throw error;

      if (data) {
        setTasks(data);
      }
    } catch (error) {
      console.error('Error initializing tasks:', error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }

  async function toggleTask(taskId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('task_definitions')
        .update({ is_active: isActive })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map((t) =>
        t.id === taskId ? { ...t, is_active: isActive } : t
      ));
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }

  // Group tasks by category
  const sections: SectionData[] = Object.entries(
    tasks.reduce((acc, task) => {
      const category = task.category as TaskCategory;
      if (!acc[category]) acc[category] = [];
      acc[category].push(task);
      return acc;
    }, {} as Record<TaskCategory, TaskDefinition[]>)
  )
    .map(([category, data]) => ({
      title: CATEGORY_LABELS[category as TaskCategory] || category,
      data,
    }))
    .sort((a, b) => {
      // Sort sections by first task's sort_order
      const aOrder = a.data[0]?.sort_order ?? 999;
      const bOrder = b.data[0]?.sort_order ?? 999;
      return aOrder - bOrder;
    });

  const activeCount = tasks.filter((t) => t.is_active).length;
  const licensedCount = tasks.filter((t) => t.requires_license && t.is_active).length;

  const renderTask = ({ item }: { item: TaskDefinition }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskName, !item.is_active && styles.taskNameDisabled]}>
            {item.name}
          </Text>
          {item.requires_license && (
            <View style={styles.licenseBadge}>
              <AlertIcon size={12} color={colors.warning[600]} />
              <Text style={styles.licenseText}>Licensed</Text>
            </View>
          )}
        </View>
        <Text style={[styles.taskDescription, !item.is_active && styles.taskDescriptionDisabled]}>
          {item.description}
        </Text>
        {item.estimated_duration_minutes && (
          <View style={styles.durationRow}>
            <ClockIcon size={12} color={colors.text.secondary} />
            <Text style={styles.durationText}>
              ~{item.estimated_duration_minutes} min
            </Text>
          </View>
        )}
      </View>
      <Switch
        value={item.is_active}
        onValueChange={(value) => toggleTask(item.id, value)}
        trackColor={{ false: colors.neutral[200], true: colors.primary[300] }}
        thumbColor={item.is_active ? colors.primary[500] : colors.neutral[400]}
      />
    </View>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.filter((t) => t.is_active).length} / {section.data.length} active
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Task Library',
          headerBackTitle: 'Settings',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Summary Header */}
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryText}>
            Configure which services your agency offers. Careseekers will select from active tasks.
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <CheckIcon size={16} color={colors.success[500]} />
              <Text style={styles.statText}>{activeCount} active</Text>
            </View>
            {licensedCount > 0 && (
              <View style={styles.statItem}>
                <AlertIcon size={16} color={colors.warning[500]} />
                <Text style={styles.statText}>{licensedCount} require license</Text>
              </View>
            )}
          </View>
        </View>

        {/* Task List */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading ? 'Loading tasks...' : 'No tasks configured'}
              </Text>
            </View>
          }
        />

        {/* Add Custom Task Button */}
        <View style={styles.footer}>
          <Button
            title="+ Add Custom Task"
            variant="outline"
            fullWidth
            onPress={() => router.push('/(protected)/agency/settings/add-task')}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryHeader: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  summaryText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontSize: 16,
  },
  sectionCount: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[3],
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskContent: {
    flex: 1,
    marginRight: spacing[3],
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 4,
  },
  taskName: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  taskNameDisabled: {
    color: colors.text.secondary,
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.warning[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  licenseText: {
    fontSize: 10,
    color: colors.warning[700],
    fontWeight: '500',
  },
  taskDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  taskDescriptionDisabled: {
    color: colors.neutral[400],
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  durationText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
});
