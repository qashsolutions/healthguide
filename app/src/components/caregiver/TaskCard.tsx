// HealthGuide TaskCard Component
// Per healthguide-caregiver/task-completion skill - Large tap targets for task completion

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, touchTargets } from '@/theme/spacing';
import { CheckIcon, XIcon } from '@/components/icons';
import { getTaskIcon } from '@/components/icons/TaskIconMapper';
import { SkipReasonModal } from './SkipReasonModal';
import { VisitTask } from '@/types/visit';

interface TaskCardProps {
  task: VisitTask;
  onComplete: () => void;
  onSkip: (reason: string) => void;
  onReset?: () => void;
}

export function TaskCard({ task, onComplete, onSkip, onReset }: TaskCardProps) {
  const [showSkipModal, setShowSkipModal] = useState(false);

  const TaskIcon = getTaskIcon(task.task?.icon || 'check');
  const isPending = task.status === 'pending';
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  const cardStyle = {
    pending: { bg: colors.surface, border: colors.neutral[200] },
    completed: { bg: colors.success[50], border: colors.success[400] },
    skipped: { bg: colors.error[50], border: colors.error[400] },
  };

  const style = cardStyle[task.status];

  function handleCardPress() {
    if (isPending) {
      onComplete();
    } else if (onReset) {
      onReset();
    }
  }

  function handleSkipPress() {
    setShowSkipModal(true);
  }

  function handleSkipSelect(reason: string) {
    onSkip(reason);
    setShowSkipModal(false);
  }

  return (
    <>
      <View style={[styles.card, { backgroundColor: style.bg, borderColor: style.border }]}>
        {/* Task Info Section */}
        <View style={styles.taskInfo}>
          <View
            style={[
              styles.iconContainer,
              isCompleted && styles.iconContainerCompleted,
              isSkipped && styles.iconContainerSkipped,
            ]}
          >
            <TaskIcon
              size={40}
              color={
                isCompleted
                  ? colors.success[600]
                  : isSkipped
                  ? colors.error[600]
                  : colors.neutral[600]
              }
            />
          </View>
          <View style={styles.taskDetails}>
            <Text style={styles.taskName}>{task.task?.name || 'Task'}</Text>
            {task.task?.description && (
              <Text style={styles.taskDescription} numberOfLines={1}>
                {task.task.description}
              </Text>
            )}
            {isSkipped && task.skipped_reason && (
              <Text style={styles.skipReason}>
                Skipped: {formatSkipReason(task.skipped_reason)}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {isPending ? (
          <View style={styles.actions}>
            {/* Complete Button - Large Green */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.completeButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={onComplete}
              accessibilityLabel={`Mark ${task.task?.name} as done`}
              accessibilityRole="button"
            >
              <CheckIcon size={36} color={colors.white} />
            </Pressable>

            {/* Skip Button - Large Red */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.skipButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleSkipPress}
              accessibilityLabel={`Skip ${task.task?.name}`}
              accessibilityRole="button"
            >
              <XIcon size={36} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.statusIndicator}
            onPress={handleCardPress}
            accessibilityLabel={`Reset ${task.task?.name}`}
            accessibilityHint="Tap to undo"
          >
            {isCompleted && (
              <View style={styles.statusBadge}>
                <CheckIcon size={32} color={colors.success[500]} />
              </View>
            )}
            {isSkipped && (
              <View style={styles.statusBadge}>
                <XIcon size={32} color={colors.error[500]} />
              </View>
            )}
            <Text style={styles.undoHint}>Tap to undo</Text>
          </Pressable>
        )}
      </View>

      {/* Skip Reason Modal */}
      <SkipReasonModal
        visible={showSkipModal}
        taskName={task.task?.name || 'Task'}
        onSelect={handleSkipSelect}
        onCancel={() => setShowSkipModal(false)}
      />
    </>
  );
}

function formatSkipReason(reason: string): string {
  const reasons: Record<string, string> = {
    client_refused: 'Client refused',
    not_enough_time: 'Not enough time',
    equipment_unavailable: 'No equipment',
    not_needed: 'Not needed today',
    other: 'Other reason',
  };
  return reasons[reason] || reason;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 2,
    minHeight: 100,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  iconContainerCompleted: {
    backgroundColor: colors.success[100],
  },
  iconContainerSkipped: {
    backgroundColor: colors.error[100],
  },
  taskDetails: {
    flex: 1,
  },
  taskName: {
    ...typography.caregiver.label,
    fontSize: 18,
    color: colors.text.primary,
  },
  taskDescription: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  skipReason: {
    ...typography.styles.caption,
    color: colors.error[600],
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    width: touchTargets.caregiver,
    height: touchTargets.caregiver,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  completeButton: {
    backgroundColor: colors.success[500],
  },
  skipButton: {
    backgroundColor: colors.error[500],
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  statusBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  undoHint: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
    fontSize: 11,
  },
});
