// HealthGuide Progress Bar Component
// Shows step progress in multi-step forms

import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';

interface Step {
  id: string;
  title: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
  onStepPress?: (index: number) => void;
  allowNavigation?: boolean;
}

export function ProgressBar({
  steps,
  currentStep,
  onStepPress,
  allowNavigation = false,
}: ProgressBarProps) {
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <View style={styles.container}>
      {/* Step indicators */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <View key={step.id} style={styles.stepWrapper}>
              <Pressable
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isCurrent && styles.stepCircleCurrent,
                  isUpcoming && styles.stepCircleUpcoming,
                ]}
                onPress={() => {
                  if (allowNavigation && onStepPress && index < currentStep) {
                    onStepPress(index);
                  }
                }}
                disabled={!allowNavigation || index >= currentStep}
                accessibilityRole="button"
                accessibilityLabel={`Step ${index + 1}: ${step.title}, ${
                  isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'
                }`}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    isCompleted && styles.stepNumberCompleted,
                    isCurrent && styles.stepNumberCurrent,
                  ]}
                >
                  {isCompleted ? '✓' : index + 1}
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.stepTitle,
                  isCurrent && styles.stepTitleCurrent,
                  isUpcoming && styles.stepTitleUpcoming,
                ]}
                numberOfLines={1}
              >
                {step.title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  stepCircleCompleted: {
    backgroundColor: colors.success[500],
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary[500],
  },
  stepCircleUpcoming: {
    backgroundColor: colors.neutral[100],
  },
  stepNumber: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    color: colors.neutral[400],
  },
  stepNumberCompleted: {
    color: colors.surface,
    fontSize: 16,
  },
  stepNumberCurrent: {
    color: colors.surface,
  },
  stepTitle: {
    ...typography.styles.caption,
    fontWeight: '500',
    color: colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 64,
  },
  stepTitleCurrent: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  stepTitleUpcoming: {
    color: colors.neutral[400],
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
  progressText: {
    ...typography.styles.caption,
    fontWeight: '500',
    color: colors.text.tertiary,
    minWidth: 70,
    textAlign: 'right',
  },
});
