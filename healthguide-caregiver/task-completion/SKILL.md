---
name: healthguide-caregiver-task-completion
description: Icon-based task completion interface for HealthGuide caregivers. Large tap targets for marking tasks done/not done, ability to decline extra tasks. Zero typing required - fully visual. Use when building task screens, status updates, or decline workflows.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: caregiver
  tags: [tasks, icons, tap-interface, visual-ui, accessibility]
---

# HealthGuide Caregiver Task Completion

## Overview
Caregivers mark tasks as complete or incomplete using large icon buttons. No typing required. If asked to do something outside their assigned tasks, they can decline. Visual feedback is immediate and clear.

## Design Principles

1. **Large Touch Targets** - Minimum 100x100dp buttons
2. **Color Coded** - Green = Done, Red = Not Done, Gray = Pending
3. **Icon First** - Every action has a clear icon
4. **Minimal Text** - Labels are short, 1-2 words max
5. **Haptic Feedback** - Vibration on every tap

## Task States

```
PENDING → (tap green) → COMPLETED
PENDING → (tap red)   → SKIPPED (with reason icon)
PENDING → (decline)   → DECLINED (outside scope)
```

## Instructions

### Step 1: Tasks Screen

```typescript
// app/(protected)/caregiver/visit/[id]/tasks.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { VisitTask } from '@/types/task';
import { TaskCard } from '@/components/caregiver/TaskCard';
import { TapButton } from '@/components/ui/TapButton';
import { NotesIcon, CheckIcon } from '@/components/icons';
import { hapticFeedback } from '@/utils/platform';

export default function TasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<VisitTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('visit_tasks')
      .select(`
        *,
        task_definition:task_definitions(
          name,
          icon_name,
          description
        )
      `)
      .eq('visit_id', id)
      .order('sort_order');

    if (data) setTasks(data);
    setLoading(false);
  }

  async function updateTaskStatus(
    taskId: string,
    status: 'completed' | 'skipped',
    reason?: string
  ) {
    // Immediate haptic feedback
    await hapticFeedback('light');
    Vibration.vibrate(50);

    // Optimistic update
    setTasks(tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : undefined,
            skipped_reason: reason,
          }
        : t
    ));

    // Persist to database
    await supabase
      .from('visit_tasks')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        skipped_reason: reason || null,
      })
      .eq('id', taskId);
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const allDone = completedCount === tasks.length;

  function handleContinue() {
    router.push(`/caregiver/visit/${id}/notes`);
  }

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <Text style={styles.progress}>
          {completedCount} / {tasks.length} Tasks
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedCount / tasks.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Task List */}
      <ScrollView style={styles.taskList} contentContainerStyle={styles.taskListContent}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={() => updateTaskStatus(task.id, 'completed')}
            onSkip={(reason) => updateTaskStatus(task.id, 'skipped', reason)}
            onDecline={() => {/* Handle decline flow */}}
          />
        ))}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.actions}>
        <TapButton
          icon={<NotesIcon size={32} color="#FFFFFF" />}
          label="Notes"
          variant="neutral"
          size="medium"
          onPress={handleContinue}
        />
        {allDone && (
          <TapButton
            icon={<CheckIcon size={32} color="#FFFFFF" />}
            label="Continue"
            variant="success"
            size="medium"
            onPress={handleContinue}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  progress: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E4E4E7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 16,
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
});
```

### Step 2: Task Card Component

```typescript
// components/caregiver/TaskCard.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { VisitTask } from '@/types/task';
import { getTaskIcon } from '@/components/icons/TaskIcons';
import { CheckIcon, XIcon, MoreIcon } from '@/components/icons';
import { SkipReasonModal } from './SkipReasonModal';

interface Props {
  task: VisitTask;
  onComplete: () => void;
  onSkip: (reason: string) => void;
  onDecline: () => void;
}

export function TaskCard({ task, onComplete, onSkip, onDecline }: Props) {
  const [showSkipModal, setShowSkipModal] = useState(false);
  const Icon = getTaskIcon(task.task_definition.icon_name);

  const statusStyles = {
    pending: { bg: '#FFFFFF', border: '#E4E4E7' },
    completed: { bg: '#D1FAE5', border: '#10B981' },
    skipped: { bg: '#FEE2E2', border: '#EF4444' },
    declined: { bg: '#F4F4F5', border: '#9CA3AF' },
  };

  const style = statusStyles[task.status];

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: style.bg, borderColor: style.border },
        ]}
      >
        {/* Task Icon & Name */}
        <View style={styles.taskInfo}>
          <View style={styles.iconContainer}>
            <Icon
              size={48}
              color={task.status === 'completed' ? '#10B981' : '#374151'}
            />
          </View>
          <Text style={styles.taskName}>{task.task_definition.name}</Text>
        </View>

        {/* Action Buttons */}
        {task.status === 'pending' ? (
          <View style={styles.actions}>
            {/* Complete Button - GREEN */}
            <Pressable
              style={[styles.actionButton, styles.completeButton]}
              onPress={onComplete}
              accessibilityLabel={`Mark ${task.task_definition.name} as done`}
            >
              <CheckIcon size={40} color="#FFFFFF" />
            </Pressable>

            {/* Skip Button - RED */}
            <Pressable
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => setShowSkipModal(true)}
              accessibilityLabel={`Mark ${task.task_definition.name} as not done`}
            >
              <XIcon size={40} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.statusIndicator}>
            {task.status === 'completed' && (
              <CheckIcon size={48} color="#10B981" />
            )}
            {task.status === 'skipped' && (
              <XIcon size={48} color="#EF4444" />
            )}
            {task.status === 'declined' && (
              <Text style={styles.declinedText}>Declined</Text>
            )}
          </View>
        )}
      </View>

      {/* Skip Reason Modal */}
      <SkipReasonModal
        visible={showSkipModal}
        taskName={task.task_definition.name}
        onSelect={(reason) => {
          onSkip(reason);
          setShowSkipModal(false);
        }}
        onDecline={() => {
          onDecline();
          setShowSkipModal(false);
        }}
        onCancel={() => setShowSkipModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  taskName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  skipButton: {
    backgroundColor: '#EF4444',
  },
  statusIndicator: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declinedText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
```

### Step 3: Skip Reason Modal (Icon-Based)

```typescript
// components/caregiver/SkipReasonModal.tsx
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import {
  ClientRefusedIcon,
  NotEnoughTimeIcon,
  EquipmentIcon,
  OtherIcon,
  DeclineIcon,
} from '@/components/icons';

interface Props {
  visible: boolean;
  taskName: string;
  onSelect: (reason: string) => void;
  onDecline: () => void;
  onCancel: () => void;
}

const SKIP_REASONS = [
  { id: 'client_refused', label: 'Client Refused', icon: ClientRefusedIcon },
  { id: 'not_enough_time', label: 'Not Enough Time', icon: NotEnoughTimeIcon },
  { id: 'equipment_unavailable', label: 'No Equipment', icon: EquipmentIcon },
  { id: 'other', label: 'Other', icon: OtherIcon },
];

export function SkipReasonModal({
  visible,
  taskName,
  onSelect,
  onDecline,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Why wasn't this done?</Text>
        <Text style={styles.taskName}>{taskName}</Text>

        <View style={styles.reasons}>
          {SKIP_REASONS.map((reason) => (
            <Pressable
              key={reason.id}
              style={styles.reasonButton}
              onPress={() => onSelect(reason.id)}
            >
              <reason.icon size={48} color="#6B7280" />
              <Text style={styles.reasonLabel}>{reason.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Decline Option */}
        <View style={styles.declineSection}>
          <Text style={styles.declineText}>
            Asked to do something extra?
          </Text>
          <Pressable style={styles.declineButton} onPress={onDecline}>
            <DeclineIcon size={32} color="#F59E0B" />
            <Text style={styles.declineLabel}>
              This wasn't assigned to me
            </Text>
          </Pressable>
        </View>

        {/* Cancel */}
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Go Back</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  taskName: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  reasonButton: {
    width: 140,
    height: 120,
    backgroundColor: '#F4F4F5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  reasonLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  declineSection: {
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    paddingTop: 24,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  declineLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#92400E',
  },
  cancelButton: {
    marginTop: 'auto',
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
```

### Step 4: Decline Task Flow

```typescript
// components/caregiver/DeclineTaskModal.tsx
import { View, Text, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AlertIcon, CheckIcon } from '@/components/icons';

interface Props {
  visible: boolean;
  visitId: string;
  taskDescription: string;
  onClose: () => void;
}

export function DeclineTaskModal({ visible, visitId, taskDescription, onClose }: Props) {
  async function handleDecline() {
    // Log the decline with details
    await supabase.from('task_declines').insert({
      visit_id: visitId,
      task_description: taskDescription,
      declined_at: new Date().toISOString(),
    });

    // Notify agency owner
    await supabase.functions.invoke('notify-task-declined', {
      body: { visit_id: visitId, task_description: taskDescription },
    });

    Alert.alert(
      'Noted',
      'The agency has been notified. Focus on your assigned tasks.',
      [{ text: 'OK', onPress: onClose }]
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <AlertIcon size={48} color="#F59E0B" />

          <Text style={styles.title}>Declining Extra Task</Text>

          <Text style={styles.message}>
            You're not required to do tasks outside your assignment.
            The agency will be notified.
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Go Back</Text>
            </Pressable>

            <Pressable style={styles.confirmButton} onPress={handleDecline}>
              <CheckIcon size={24} color="#FFFFFF" />
              <Text style={styles.confirmText}>Decline Task</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

## Icon Mapping

```typescript
// components/icons/TaskIcons.tsx
// Map task icon names to components

import {
  CompanionshipIcon,
  MealIcon,
  CleaningIcon,
  ErrandsIcon,
  MobilityIcon,
  BathingIcon,
  DressingIcon,
  GroomingIcon,
  MedicationIcon,
  DefaultTaskIcon,
} from './index';

const TASK_ICONS: Record<string, React.ComponentType<any>> = {
  companionship: CompanionshipIcon,
  meal: MealIcon,
  cleaning: CleaningIcon,
  errands: ErrandsIcon,
  mobility: MobilityIcon,
  bathing: BathingIcon,
  dressing: DressingIcon,
  grooming: GroomingIcon,
  medication_reminder: MedicationIcon,
  laundry: CleaningIcon,
  shopping: ErrandsIcon,
  exercise: MobilityIcon,
  feeding: MealIcon,
  toileting: BathingIcon,
  pet: ErrandsIcon,
};

export function getTaskIcon(iconName: string) {
  return TASK_ICONS[iconName] || DefaultTaskIcon;
}
```

## Troubleshooting

### Buttons not responding
**Cause:** Touch area too small or gesture conflict
**Solution:** Ensure minimum 48x48dp, check for ScrollView conflicts

### Status not persisting
**Cause:** Optimistic update without database sync
**Solution:** Add error handling and retry logic
