// HealthGuide Input Component
// Per healthguide-core/ui-components skill - Accessible form inputs

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, touchTargets } from '@/theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  size?: 'default' | 'large' | 'caregiver';
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  size = 'default',
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const isMultiline = !!props.multiline;
  const inputHeight = isMultiline ? undefined : size === 'caregiver' ? touchTargets.caregiver : size === 'large' ? 56 : 48;
  const fontSize = size === 'caregiver' ? 20 : size === 'large' ? 18 : 16;

  const borderColor = error
    ? colors.error[500]
    : isFocused
    ? colors.primary[500]
    : colors.neutral[300];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, size === 'caregiver' && styles.labelLarge]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            height: inputHeight,
            borderColor,
          },
          isMultiline && styles.inputContainerMultiline,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...props}
          style={[
            styles.input,
            { fontSize },
            isMultiline && styles.inputMultiline,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style,
          ]}
          placeholderTextColor={colors.neutral[400]}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

// OTP Input for phone verification
interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function OTPInput({ length = 6, value, onChange, error }: OTPInputProps) {
  const inputRef = React.useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.otpContainer}>
      <Pressable onPress={handlePress} style={styles.otpBoxes}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.otpBox,
              value[index] && styles.otpBoxFilled,
              error && styles.otpBoxError,
            ]}
          >
            <Text style={styles.otpText}>{value[index] || ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        autoComplete="one-time-code"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  labelLarge: {
    fontSize: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    minHeight: 100,
    paddingVertical: spacing[2],
  },
  inputFocused: {
    borderColor: colors.primary[500],
  },
  inputError: {
    borderColor: colors.error[500],
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: spacing[2],
    outlineStyle: 'none' as any, // Suppress browser focus outline (custom border handles it)
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing[2],
  },
  inputWithRightIcon: {
    paddingRight: spacing[2],
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  rightIcon: {
    marginLeft: spacing[2],
    padding: spacing[1],
  },
  helperText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  errorText: {
    color: colors.error[500],
  },
  // OTP Styles
  otpContainer: {
    alignItems: 'center',
  },
  otpBoxes: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  otpBoxFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  otpBoxError: {
    borderColor: colors.error[500],
  },
  otpText: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
  },
});
