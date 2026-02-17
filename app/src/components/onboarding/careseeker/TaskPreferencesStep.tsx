// HealthGuide Careseeker Onboarding - Task Preferences Step
// Icon-based task selection from agency's task library

import { useState, useEffect } from 'react';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import {
  HandCareIcon,
  WalkingIcon,
  AppleIcon,
  PillIcon,
  HomeIcon,
  MessageIcon,
  FileTextIcon,
  IconProps,
} from '@/components/icons';
import * as Haptics from 'expo-haptics';
import { createShadow } from '@/theme/spacing';

interface Task {
  id: string;
  name: string;
  category: string;
  icon: string;
  default_frequency: string;
}

interface TaskPreference {
  task_id: string;
  is_required: boolean;
  frequency: string;
}

interface Props {
  agencyId: string;
  selectedTasks: TaskPreference[];
  onUpdate: (tasks: TaskPreference[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORIES: { id: string; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { id: 'personal_care', label: 'Personal Care', Icon: HandCareIcon },
  { id: 'mobility', label: 'Mobility', Icon: WalkingIcon },
  { id: 'nutrition', label: 'Nutrition', Icon: AppleIcon },
  { id: 'medication', label: 'Medication', Icon: PillIcon },
  { id: 'housekeeping', label: 'Housekeeping', Icon: HomeIcon },
  { id: 'companionship', label: 'Companionship', Icon: MessageIcon },
];

export function TaskPreferencesStep({
  agencyId,
  selectedTasks,
  onUpdate,
  onNext,
  onBack,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('personal_care');

  useEffect(() => {
    fetchTasks();
  }, [agencyId]);

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('task_library')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setTasks(data);
      // Auto-select first category that has tasks
      const categoriesWithTasks = [...new Set(data.map((t) => t.category))];
      if (categoriesWithTasks.length > 0 && !categoriesWithTasks.includes(activeCategory)) {
        setActiveCategory(categoriesWithTasks[0]);
      }
    }
    setLoading(false);
  }

  const toggleTask = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const existing = selectedTasks.find((t) => t.task_id === task.id);

    if (existing) {
      onUpdate(selectedTasks.filter((t) => t.task_id !== task.id));
    } else {
      onUpdate([
        ...selectedTasks,
        {
          task_id: task.id,
          is_required: false,
          frequency: task.default_frequency || 'every_visit',
        },
      ]);
    }
  };

  const isSelected = (taskId: string) => selectedTasks.some((t) => t.task_id === taskId);

  const filteredTasks = tasks.filter((t) => t.category === activeCategory);
  const categoriesWithTasks = CATEGORIES.filter((cat) =>
    tasks.some((t) => t.category === cat.id)
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Care Tasks</Text>
        </View>
        <View style={styles.emptyState}>
          <FileTextIcon size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No tasks available</Text>
          <Text style={styles.emptySubtext}>
            The agency hasn't set up their task library yet. You can skip this step and add tasks
            later.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button title="Back" variant="outline" onPress={onBack} style={styles.backButton} />
          <Button title="Skip & Continue" onPress={onNext} style={styles.nextButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Care Tasks</Text>
        <Text style={styles.subtitle}>
          Select the tasks caregivers should perform during visits
        </Text>
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedCount}>{selectedTasks.length} tasks selected</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categoriesWithTasks.map((cat) => {
          const tasksInCategory = tasks.filter((t) => t.category === cat.id);
          const selectedInCategory = selectedTasks.filter((st) =>
            tasksInCategory.some((t) => t.id === st.task_id)
          ).length;
          const CatIcon = cat.Icon;

          return (
            <Pressable
              key={cat.id}
              style={[styles.categoryTab, activeCategory === cat.id && styles.categoryTabActive]}
              onPress={() => setActiveCategory(cat.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeCategory === cat.id }}
            >
              <CatIcon size={24} color={activeCategory === cat.id ? '#FFFFFF' : '#6B7280'} />
              <Text
                style={[
                  styles.categoryLabel,
                  activeCategory === cat.id && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
              {selectedInCategory > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{selectedInCategory}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Task Grid */}
      <ScrollView style={styles.taskScroll} contentContainerStyle={styles.taskGrid}>
        {filteredTasks.map((task) => (
          <Pressable
            key={task.id}
            style={[styles.taskCard, isSelected(task.id) && styles.taskCardSelected]}
            onPress={() => toggleTask(task)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected(task.id) }}
            accessibilityLabel={`${task.name}, ${isSelected(task.id) ? 'selected' : 'not selected'}`}
          >
            <Text style={styles.taskIcon}>{task.icon}</Text>
            <Text
              style={[styles.taskName, isSelected(task.id) && styles.taskNameSelected]}
              numberOfLines={2}
            >
              {task.name}
            </Text>
            {isSelected(task.id) && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={onBack} style={styles.backButton} />
        <Button title="Continue" onPress={onNext} style={styles.nextButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 24,
  },
  selectedBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  categoryScroll: {
    maxHeight: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  categoryTab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 90,
    position: 'relative',
  },
  categoryTabActive: {
    backgroundColor: '#3B82F6',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  categoryBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taskScroll: {
    flex: 1,
  },
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  taskCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    ...createShadow(1, 0.05, 4, 1),
  },
  taskCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  taskIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
  },
  taskNameSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
