// HealthGuide Skip Reason Modal
// Per healthguide-caregiver/task-completion skill - Icon-based skip reasons

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, SafeAreaView } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, touchTargets } from '@/theme/spacing';
import { XIcon, ClockIcon, PersonIcon, ArrowLeftIcon } from '@/components/icons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface SkipReasonModalProps {
  visible: boolean;
  taskName: string;
  onSelect: (reason: string) => void;
  onCancel: () => void;
}

// Custom icons for skip reasons
function ClientRefusedIcon({ size = 48, color = colors.neutral[600] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="14" r="8" stroke={color} strokeWidth={2.5} />
      <Path
        d="M10 44V38C10 33.58 13.58 30 18 30H30C34.42 30 38 33.58 38 38V44"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M16 18L32 34"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function NotEnoughTimeIcon({ size = 48, color = colors.neutral[600] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="18" stroke={color} strokeWidth={2.5} />
      <Path
        d="M24 12V24L32 28"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 8L40 40"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EquipmentIcon({ size = 48, color = colors.neutral[600] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="8" y="12" width="32" height="28" rx="3" stroke={color} strokeWidth={2.5} />
      <Path d="M16 12V8" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M32 12V8" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx="24" cy="26" r="8" stroke={color} strokeWidth={2.5} />
      <Path
        d="M20 26L28 26"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function NotNeededIcon({ size = 48, color = colors.neutral[600] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="18" stroke={color} strokeWidth={2.5} />
      <Path
        d="M18 24H30"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function OtherIcon({ size = 48, color = colors.neutral[600] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="12" cy="24" r="4" fill={color} />
      <Circle cx="24" cy="24" r="4" fill={color} />
      <Circle cx="36" cy="24" r="4" fill={color} />
    </Svg>
  );
}

const SKIP_REASONS = [
  { id: 'client_refused', label: 'Client Refused', Icon: ClientRefusedIcon },
  { id: 'not_enough_time', label: 'Not Enough Time', Icon: NotEnoughTimeIcon },
  { id: 'equipment_unavailable', label: 'No Equipment', Icon: EquipmentIcon },
  { id: 'not_needed', label: 'Not Needed Today', Icon: NotNeededIcon },
  { id: 'other', label: 'Other Reason', Icon: OtherIcon },
];

export function SkipReasonModal({
  visible,
  taskName,
  onSelect,
  onCancel,
}: SkipReasonModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeftIcon size={24} color={colors.text.secondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Skip Task</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Why wasn't this done?</Text>
          <Text style={styles.taskName}>{taskName}</Text>

          {/* Reason Grid */}
          <View style={styles.reasonGrid}>
            {SKIP_REASONS.map((reason) => (
              <Pressable
                key={reason.id}
                style={({ pressed }) => [
                  styles.reasonButton,
                  pressed && styles.reasonButtonPressed,
                ]}
                onPress={() => onSelect(reason.id)}
                accessibilityLabel={`Skip because ${reason.label}`}
                accessibilityRole="button"
              >
                <reason.Icon size={48} color={colors.neutral[600]} />
                <Text style={styles.reasonLabel}>{reason.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Cancel Button */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing[6],
    alignItems: 'center',
  },
  title: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  taskName: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[4],
  },
  reasonButton: {
    width: 140,
    height: 130,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[3],
  },
  reasonButtonPressed: {
    backgroundColor: colors.neutral[200],
    transform: [{ scale: 0.98 }],
  },
  reasonLabel: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[2],
    fontSize: 14,
  },
  footer: {
    padding: spacing[6],
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
});
