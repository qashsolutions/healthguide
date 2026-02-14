// HealthGuide Progress Bar Component
// Shows step progress in multi-step forms

import { View, Text, StyleSheet, Pressable } from 'react-native';

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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepCircleCurrent: {
    backgroundColor: '#3B82F6',
  },
  stepCircleUpcoming: {
    backgroundColor: '#F3F4F6',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepNumberCompleted: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  stepNumberCurrent: {
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 64,
  },
  stepTitleCurrent: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  stepTitleUpcoming: {
    color: '#9CA3AF',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    minWidth: 70,
    textAlign: 'right',
  },
});
