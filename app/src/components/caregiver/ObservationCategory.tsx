// HealthGuide Observation Category Component
// Per healthguide-caregiver/observations skill - Icon-based observation selection

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { getObservationIcon } from '@/components/icons/ObservationIcons';

interface ObservationOption {
  value: string;
  label: string;
  icon: string;
}

interface ObservationCategoryProps {
  title: string;
  options: ObservationOption[];
  selected?: string;
  onSelect: (value: string, icon: string) => void;
}

export function ObservationCategory({
  title,
  options,
  selected,
  onSelect,
}: ObservationCategoryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const Icon = getObservationIcon(option.icon);
          const isSelected = selected === option.value;

          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              onPress={() => onSelect(option.value, option.icon)}
              accessibilityLabel={`${option.label}${isSelected ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Icon
                size={36}
                color={isSelected ? colors.primary[600] : colors.neutral[500]}
              />
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                ]}
                numberOfLines={2}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[5],
  },
  title: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[3],
    paddingLeft: spacing[1],
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  option: {
    width: 85,
    height: 95,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[200],
    padding: spacing[2],
  },
  optionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionPressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[1],
    fontSize: 11,
  },
  labelSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});
