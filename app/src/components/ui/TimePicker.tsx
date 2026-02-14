// HealthGuide TimePicker Component
// Simple time picker for notification preferences

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface TimePickerProps {
  value: string; // Format: "HH:mm"
  onChange: (time: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempHour, setTempHour] = useState(parseInt(value?.split(':')[0] || '9'));
  const [tempMinute, setTempMinute] = useState(parseInt(value?.split(':')[1] || '0'));

  const formatTime = (time: string) => {
    if (!time) return '9:00 AM';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleConfirm = () => {
    const timeString = `${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
    setShowPicker(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.buttonText}>{formatTime(value)}</Text>
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>

            <View style={styles.pickerRow}>
              {/* Hour picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <View style={styles.scrollContainer}>
                  {hours.map((hour) => (
                    <Pressable
                      key={hour}
                      style={[
                        styles.pickerItem,
                        tempHour === hour && styles.pickerItemSelected,
                      ]}
                      onPress={() => setTempHour(hour)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempHour === hour && styles.pickerItemTextSelected,
                        ]}
                      >
                        {hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Minute picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <View style={styles.scrollContainer}>
                  {minutes.map((minute) => (
                    <Pressable
                      key={minute}
                      style={[
                        styles.pickerItem,
                        tempMinute === minute && styles.pickerItemSelected,
                      ]}
                      onPress={() => setTempMinute(minute)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempMinute === minute && styles.pickerItemTextSelected,
                        ]}
                      >
                        :{minute.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  button: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    ...typography.styles.label,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  scrollContainer: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[1],
  },
  pickerItemSelected: {
    backgroundColor: colors.primary[100],
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
});
