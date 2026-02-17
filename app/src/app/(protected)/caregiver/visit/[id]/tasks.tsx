// HealthGuide Task Completion Screen
// Per healthguide-caregiver/task-completion skill - Icon-based task interface

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TaskCard } from '@/components/caregiver/TaskCard';
import { TapButton } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CheckIcon, ArrowLeftIcon, FileTextIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/haptics';
import { VisitTask, TaskStatus } from '@/types/visit';
import { supabase } from '@/lib/supabase';

interface AssignmentTask {
  id: string;
  assignment_id: string;
  task_id: string;
  status: TaskStatus;
  completed_at: string | null;
  skipped_reason: string | null;
  notes: string | null;
  task: {
    id: string;
    name: string;
    icon: string;
    category: string;
    description: string | null;
  };
}

interface ElderInfo {
  first_name: string;
  last_name: string;
}

export default function TasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<VisitTask[]>([]);
  const [elderInfo, setElderInfo] = useState<ElderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tasks for this assignment
  const fetchTasks = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('visit_tasks')
      .select(`
        id,
        assignment_id,
        task_id,
        status,
        completed_at,
        skipped_reason,
        notes,
        task:task_library (
          id,
          name,
          icon,
          category,
          description
        )
      `)
      .eq('assignment_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
      return;
    }

    // Transform to VisitTask format
    // Transform Supabase join (array) to object for task relation
    const visitTasks: VisitTask[] = (data || []).map((t: any) => {
      const taskData = Array.isArray(t.task) ? t.task[0] : t.task;
      return {
        id: t.id,
        visit_id: t.assignment_id,
        task_id: t.task_id,
        status: t.status as TaskStatus,
        completed_at: t.completed_at || undefined,
        skipped_reason: t.skipped_reason || undefined,
        task: taskData ? {
          id: taskData.id,
          agency_id: '',
          name: taskData.name,
          category: taskData.category as any,
          icon: taskData.icon,
          description: taskData.description || undefined,
        } : undefined,
      };
    });

    setTasks(visitTasks);
    setLoading(false);
  }, [id]);

  // Fetch elder info
  const fetchElderInfo = useCallback(async () => {
    if (!id) return;

    const { data } = await supabase
      .from('visits')
      .select(`
        elder:elders (
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single();

    if (data?.elder) {
      // Transform Supabase join (array) to object
      const elderData = Array.isArray(data.elder) ? data.elder[0] : data.elder;
      setElderInfo(elderData);
    }
  }, [id]);

  useEffect(() => {
    fetchTasks();
    fetchElderInfo();
  }, [fetchTasks, fetchElderInfo]);

  // Calculate progress
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  async function handleTaskComplete(taskId: string) {
    await hapticFeedback('success');

    // Optimistic update
    setTasks(tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: 'completed' as TaskStatus,
            completed_at: new Date().toISOString(),
          }
        : task
    ));

    // Update in Supabase
    const { error } = await supabase
      .from('visit_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error completing task:', error);
      fetchTasks(); // Revert on error
    }
  }

  async function handleTaskSkip(taskId: string, reason: string) {
    await hapticFeedback('warning');

    // Optimistic update
    setTasks(tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: 'skipped' as TaskStatus,
            skipped_reason: reason,
          }
        : task
    ));

    // Update in Supabase
    const { error } = await supabase
      .from('visit_tasks')
      .update({
        status: 'skipped',
        skipped_reason: reason,
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error skipping task:', error);
      fetchTasks();
    }
  }

  async function handleTaskReset(taskId: string) {
    await hapticFeedback('light');

    // Optimistic update
    setTasks(tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: 'pending' as TaskStatus,
            completed_at: undefined,
            skipped_reason: undefined,
          }
        : task
    ));

    // Update in Supabase
    const { error } = await supabase
      .from('visit_tasks')
      .update({
        status: 'pending',
        completed_at: null,
        skipped_reason: null,
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error resetting task:', error);
      fetchTasks();
    }
  }

  function handleContinue() {
    router.push(`/(protected)/caregiver/visit/${id}/notes`);
  }

  function handleBack() {
    Alert.alert(
      'Leave Tasks?',
      'Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', onPress: () => router.back() },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TapButton
            icon={<ArrowLeftIcon size={24} color={colors.text.secondary} />}
            size="medium"
            variant="neutral"
            onPress={handleBack}
          />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {elderInfo ? `${elderInfo.first_name}'s Tasks` : 'Visit Tasks'}
            </Text>
            <Text style={styles.progressText}>
              {completedCount} of {totalCount} completed
            </Text>
          </View>
          <View style={{ width: 80 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
                allDone && styles.progressFillComplete,
              ]}
            />
          </View>
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}><FileTextIcon size={48} color={colors.neutral[300]} /></View>
            <Text style={styles.emptyText}>No tasks assigned</Text>
            <Text style={styles.emptySubtext}>Continue to add observations</Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => handleTaskComplete(task.id)}
              onSkip={(reason) => handleTaskSkip(task.id, reason)}
              onReset={() => handleTaskReset(task.id)}
            />
          ))
        )}

        {/* Bottom spacer for continue button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TapButton
          icon={<CheckIcon size={32} color={colors.white} />}
          label={allDone ? 'All Done!' : 'Continue'}
          variant={allDone ? 'success' : 'primary'}
          size="large"
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
  },
  progressText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  progressBarContainer: {
    paddingHorizontal: spacing[2],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: roleColors.caregiver,
    borderRadius: borderRadius.full,
  },
  progressFillComplete: {
    backgroundColor: colors.success[500],
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});
