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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, shadows } from '@/theme/spacing';
import { CheckIcon } from '@/components/icons';
import { ALLOWED_CATEGORY_LABELS } from '@/constants/tasks';

interface TaskDefinition {
  id: string;
  agency_id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  is_active: boolean;
}

interface SectionData {
  title: string;
  data: TaskDefinition[];
}

export default function TaskLibraryScreen() {
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
        .from('task_library')
        .select('id, agency_id, name, description, category, icon, is_active')
        .eq('agency_id', user.agency_id)
        .in('category', ['companionship', 'housekeeping', 'errands'])
        .order('name');

      if (error) throw error;

      if (data) {
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }

  async function toggleTask(taskId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('task_library')
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
      const category = task.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(task);
      return acc;
    }, {} as Record<string, TaskDefinition[]>)
  )
    .map(([category, data]) => ({
      title: ALLOWED_CATEGORY_LABELS[category] || category,
      data,
    }));

  const activeCount = tasks.filter((t) => t.is_active).length;

  const renderTask = ({ item }: { item: TaskDefinition }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskContent}>
        <Text style={[styles.taskName, !item.is_active && styles.taskNameDisabled]}>
          {item.name}
        </Text>
        <Text style={[styles.taskDescription, !item.is_active && styles.taskDescriptionDisabled]}>
          {item.description}
        </Text>
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
            Companions provide companionship, light cleaning, and grocery help only.
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <CheckIcon size={16} color={colors.success[500]} />
              <Text style={styles.statText}>{activeCount} of {tasks.length} active</Text>
            </View>
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

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tasks are restricted to non-medical companionship services.
          </Text>
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
    ...shadows.sm,
  },
  taskContent: {
    flex: 1,
    marginRight: spacing[3],
  },
  taskName: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: 4,
  },
  taskNameDisabled: {
    color: colors.text.secondary,
  },
  taskDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  taskDescriptionDisabled: {
    color: colors.neutral[400],
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
  footerText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
