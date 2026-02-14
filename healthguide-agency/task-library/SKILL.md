---
name: healthguide-agency-task-library
description: Master task list management for HealthGuide agencies. Agency owners define available care tasks that careseekers can select from. Use when building task definition screens, task categories, or configuring what services an agency offers.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [tasks, services, care-types, configuration]
---

# HealthGuide Task Library

## Overview
Agency owners define the master list of tasks/services their agency offers. Careseekers select from this list when setting up care. Caregivers see only the tasks assigned for each visit.

## Default Task Categories

Most caregivers are unlicensed and provide:
- **Companionship** (default for all)
- **Light housekeeping**
- **Meal preparation**
- **Errands/shopping**
- **Mobility assistance**
- **Medication reminders** (NOT administration)
- **Personal care assistance**

## Data Model

```typescript
// types/task.ts
export interface TaskDefinition {
  id: string;
  agency_id: string;

  // Task info
  name: string;
  description: string;
  category: TaskCategory;
  icon_name: string; // Maps to SVG icon

  // Requirements
  requires_license: boolean;
  estimated_duration_minutes?: number;

  // Status
  is_active: boolean;
  sort_order: number;

  created_at: string;
  updated_at: string;
}

export type TaskCategory =
  | 'companionship'
  | 'household'
  | 'nutrition'
  | 'mobility'
  | 'personal_care'
  | 'health'
  | 'errands'
  | 'other';

// Task instance on a visit
export interface VisitTask {
  id: string;
  visit_id: string;
  task_definition_id: string;
  task_name: string; // Denormalized for history

  status: 'pending' | 'completed' | 'skipped' | 'declined';
  completed_at?: string;
  declined_reason?: string;
  notes?: string;
}
```

## Default Tasks Template

```typescript
// data/defaultTasks.ts
export const DEFAULT_TASKS: Omit<TaskDefinition, 'id' | 'agency_id' | 'created_at' | 'updated_at'>[] = [
  // Companionship
  {
    name: 'Companionship',
    description: 'Provide friendly conversation and emotional support',
    category: 'companionship',
    icon_name: 'companionship',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 1,
  },
  {
    name: 'Accompany to Appointments',
    description: 'Escort to medical appointments or social activities',
    category: 'companionship',
    icon_name: 'car',
    requires_license: false,
    estimated_duration_minutes: 120,
    is_active: true,
    sort_order: 2,
  },

  // Household
  {
    name: 'Light Housekeeping',
    description: 'Dusting, vacuuming, tidying up living spaces',
    category: 'household',
    icon_name: 'cleaning',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 10,
  },
  {
    name: 'Laundry',
    description: 'Washing, drying, folding clothes',
    category: 'household',
    icon_name: 'laundry',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 11,
  },
  {
    name: 'Organize Living Space',
    description: 'Help organize closets, drawers, or rooms',
    category: 'household',
    icon_name: 'organize',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 12,
  },

  // Nutrition
  {
    name: 'Meal Preparation',
    description: 'Prepare nutritious meals according to dietary needs',
    category: 'nutrition',
    icon_name: 'meal',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 20,
  },
  {
    name: 'Feeding Assistance',
    description: 'Help with eating if needed',
    category: 'nutrition',
    icon_name: 'feeding',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 21,
  },
  {
    name: 'Grocery Shopping',
    description: 'Purchase groceries from a provided list',
    category: 'nutrition',
    icon_name: 'shopping',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 22,
  },

  // Mobility
  {
    name: 'Mobility Assistance',
    description: 'Help with walking, transferring, or using mobility aids',
    category: 'mobility',
    icon_name: 'mobility',
    requires_license: false,
    estimated_duration_minutes: 15,
    is_active: true,
    sort_order: 30,
  },
  {
    name: 'Exercise Assistance',
    description: 'Assist with prescribed exercises or light stretching',
    category: 'mobility',
    icon_name: 'exercise',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 31,
  },

  // Personal Care
  {
    name: 'Bathing Assistance',
    description: 'Help with bathing or showering',
    category: 'personal_care',
    icon_name: 'bathing',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 40,
  },
  {
    name: 'Dressing Assistance',
    description: 'Help with getting dressed',
    category: 'personal_care',
    icon_name: 'dressing',
    requires_license: false,
    estimated_duration_minutes: 15,
    is_active: true,
    sort_order: 41,
  },
  {
    name: 'Grooming',
    description: 'Hair care, shaving, nail care',
    category: 'personal_care',
    icon_name: 'grooming',
    requires_license: false,
    estimated_duration_minutes: 20,
    is_active: true,
    sort_order: 42,
  },
  {
    name: 'Toileting Assistance',
    description: 'Help with bathroom needs',
    category: 'personal_care',
    icon_name: 'toileting',
    requires_license: false,
    estimated_duration_minutes: 15,
    is_active: true,
    sort_order: 43,
  },

  // Health (Non-medical)
  {
    name: 'Medication Reminders',
    description: 'Remind to take medications (NOT administer)',
    category: 'health',
    icon_name: 'medication_reminder',
    requires_license: false,
    estimated_duration_minutes: 5,
    is_active: true,
    sort_order: 50,
  },
  {
    name: 'Medication Administration',
    description: 'Administer medications as prescribed',
    category: 'health',
    icon_name: 'medication',
    requires_license: true, // LICENSED ONLY
    estimated_duration_minutes: 10,
    is_active: false, // Off by default
    sort_order: 51,
  },
  {
    name: 'Vital Signs Monitoring',
    description: 'Check blood pressure, temperature, etc.',
    category: 'health',
    icon_name: 'vitals',
    requires_license: true, // LICENSED ONLY
    estimated_duration_minutes: 10,
    is_active: false,
    sort_order: 52,
  },

  // Errands
  {
    name: 'Run Errands',
    description: 'Pick up prescriptions, mail packages, etc.',
    category: 'errands',
    icon_name: 'errands',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 60,
  },
  {
    name: 'Pet Care',
    description: 'Feed pets, walk dogs, clean litter box',
    category: 'errands',
    icon_name: 'pet',
    requires_license: false,
    estimated_duration_minutes: 20,
    is_active: true,
    sort_order: 61,
  },
];
```

## Instructions

### Step 1: Task Library Screen

```typescript
// app/(protected)/agency/settings/task-library.tsx
import { useState, useEffect } from 'react';
import { View, SectionList, StyleSheet, Text, Switch } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TaskDefinition, TaskCategory } from '@/types/task';
import { TaskDefinitionCard } from '@/components/agency/TaskDefinitionCard';
import { Button } from '@/components/ui/Button';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  companionship: 'Companionship',
  household: 'Household',
  nutrition: 'Nutrition & Meals',
  mobility: 'Mobility',
  personal_care: 'Personal Care',
  health: 'Health',
  errands: 'Errands',
  other: 'Other',
};

export default function TaskLibraryScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('task_definitions')
      .select('*')
      .eq('agency_id', user!.agency_id)
      .order('sort_order');

    if (data) setTasks(data);
    setLoading(false);
  }

  async function toggleTask(taskId: string, isActive: boolean) {
    await supabase
      .from('task_definitions')
      .update({ is_active: isActive })
      .eq('id', taskId);

    setTasks(tasks.map((t) =>
      t.id === taskId ? { ...t, is_active: isActive } : t
    ));
  }

  // Group tasks by category
  const sections = Object.entries(
    tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {} as Record<TaskCategory, TaskDefinition[]>)
  ).map(([category, data]) => ({
    title: CATEGORY_LABELS[category as TaskCategory],
    data,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Configure which services your agency offers.
        Careseekers will select from active tasks.
      </Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TaskDefinitionCard
            task={item}
            onToggle={(isActive) => toggleTask(item.id, isActive)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchTasks}
      />

      <Button
        title="+ Add Custom Task"
        variant="outline"
        onPress={() => {/* Navigate to add task */}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  description: {
    padding: 16,
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
});
```

### Step 2: Task Definition Card

```typescript
// components/agency/TaskDefinitionCard.tsx
import { View, Text, Switch, StyleSheet } from 'react-native';
import { TaskDefinition } from '@/types/task';
import { getTaskIcon } from '@/components/icons/TaskIcons';
import { AlertIcon } from '@/components/icons';

interface Props {
  task: TaskDefinition;
  onToggle: (isActive: boolean) => void;
}

export function TaskDefinitionCard({ task, onToggle }: Props) {
  const Icon = getTaskIcon(task.icon_name);

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Icon size={32} color={task.is_active ? '#3B82F6' : '#9CA3AF'} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{task.name}</Text>
          {task.requires_license && (
            <View style={styles.licenseBadge}>
              <AlertIcon size={12} color="#F59E0B" />
              <Text style={styles.licenseText}>Licensed</Text>
            </View>
          )}
        </View>
        <Text style={styles.description}>{task.description}</Text>
        {task.estimated_duration_minutes && (
          <Text style={styles.duration}>
            ~{task.estimated_duration_minutes} min
          </Text>
        )}
      </View>

      <Switch
        value={task.is_active}
        onValueChange={onToggle}
        trackColor={{ false: '#E4E4E7', true: '#93C5FD' }}
        thumbColor={task.is_active ? '#3B82F6' : '#9CA3AF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  licenseText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  duration: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
```

### Step 3: Initialize Default Tasks for New Agency

```typescript
// utils/initializeAgency.ts
import { supabase } from '@/lib/supabase';
import { DEFAULT_TASKS } from '@/data/defaultTasks';

export async function initializeAgencyTasks(agencyId: string) {
  const tasksToInsert = DEFAULT_TASKS.map((task) => ({
    ...task,
    agency_id: agencyId,
  }));

  const { error } = await supabase
    .from('task_definitions')
    .insert(tasksToInsert);

  if (error) {
    console.error('Error initializing tasks:', error);
    throw error;
  }
}
```

### Step 4: Care Needs Selector (for Careseeker)

```typescript
// components/agency/CareNeedsSelector.tsx
import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TaskDefinition } from '@/types/task';
import { getTaskIcon } from '@/components/icons/TaskIcons';
import { CheckIcon } from '@/components/icons';

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CareNeedsSelector({ selected, onChange }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);

  useEffect(() => {
    async function fetchTasks() {
      const { data } = await supabase
        .from('task_definitions')
        .select('*')
        .eq('agency_id', user!.agency_id)
        .eq('is_active', true)
        .order('sort_order');

      if (data) setTasks(data);
    }
    fetchTasks();
  }, []);

  function toggleTask(taskId: string) {
    if (selected.includes(taskId)) {
      onChange(selected.filter((id) => id !== taskId));
    } else {
      onChange([...selected, taskId]);
    }
  }

  return (
    <View style={styles.container}>
      {tasks.map((task) => {
        const Icon = getTaskIcon(task.icon_name);
        const isSelected = selected.includes(task.id);

        return (
          <Pressable
            key={task.id}
            style={[styles.taskCard, isSelected && styles.taskCardSelected]}
            onPress={() => toggleTask(task.id)}
          >
            <Icon size={32} color={isSelected ? '#3B82F6' : '#6B7280'} />
            <Text style={[styles.taskName, isSelected && styles.taskNameSelected]}>
              {task.name}
            </Text>
            {isSelected && (
              <View style={styles.checkmark}>
                <CheckIcon size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E4E4E7',
  },
  taskCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  taskName: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    color: '#6B7280',
  },
  taskNameSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

## Troubleshooting

### Tasks not showing for careseeker selection
**Cause:** Tasks not marked as `is_active`
**Solution:** Check agency's task_definitions and ensure relevant tasks are active

### Licensed tasks appearing for unlicensed caregivers
**Cause:** Task filtering not checking caregiver license status
**Solution:** Filter tasks by `requires_license` based on caregiver profile
