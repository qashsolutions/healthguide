// HealthGuide LargeInput Component
// Per healthguide-careseeker/onboarding skill - Large, accessible inputs for elders

import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, touchTargets } from '@/theme/spacing';

interface LargeInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const LargeInput = forwardRef<TextInput, LargeInputProps>(
  ({ label, error, containerStyle, style, ...props }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={colors.text.disabled}
          {...props}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

LargeInput.displayName = 'LargeInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
    fontSize: 18,
  },
  input: {
    minHeight: touchTargets.elder,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 20,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error[500],
  },
  errorText: {
    ...typography.styles.caption,
    color: colors.error[600],
    marginTop: spacing[1],
    fontSize: 14,
  },
});
