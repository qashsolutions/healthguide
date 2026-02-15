// HealthGuide Day Schedule Component
// Shows time slots for a selected day

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { format } from 'date-fns';
import Svg, { Path } from 'react-native-svg';
import { createShadow } from '@/theme/spacing';

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  caregiver?: {
    first_name: string;
  };
  elder?: {
    first_name: string;
    last_name: string;
  };
}

interface Props {
  slots: TimeSlot[];
  onSlotPress: (slot: TimeSlot) => void;
  onAssign: (slot: TimeSlot) => void;
}

function ClockIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function UserPlusIcon({ size = 16, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatTimeRange(start: string, end: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function getStatusConfig(status: TimeSlot['status']) {
  switch (status) {
    case 'available':
      return {
        bg: '#EFF6FF',
        border: '#3B82F6',
        text: '#1E40AF',
        label: 'Available',
      };
    case 'assigned':
      return {
        bg: '#FEF3C7',
        border: '#F59E0B',
        text: '#92400E',
        label: 'Assigned',
      };
    case 'in_progress':
      return {
        bg: '#D1FAE5',
        border: '#10B981',
        text: '#065F46',
        label: 'In Progress',
      };
    case 'completed':
      return {
        bg: '#F3F4F6',
        border: '#9CA3AF',
        text: '#374151',
        label: 'Completed',
      };
    case 'cancelled':
      return {
        bg: '#FEE2E2',
        border: '#EF4444',
        text: '#991B1B',
        label: 'Cancelled',
      };
    default:
      return {
        bg: '#F3F4F6',
        border: '#D1D5DB',
        text: '#6B7280',
        label: 'Unknown',
      };
  }
}

export function DaySchedule({ slots, onSlotPress, onAssign }: Props) {
  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No time slots for this day</Text>
        <Text style={styles.emptySubtext}>
          Add a slot to start scheduling visits
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {slots.map((slot) => {
        const statusConfig = getStatusConfig(slot.status);
        const isAvailable = slot.status === 'available';

        return (
          <Pressable
            key={slot.id}
            style={[
              styles.slot,
              {
                backgroundColor: statusConfig.bg,
                borderLeftColor: statusConfig.border,
              },
            ]}
            onPress={() => onSlotPress(slot)}
          >
            <View style={styles.slotHeader}>
              <View style={styles.timeRow}>
                <ClockIcon size={14} color="#6B7280" />
                <Text style={styles.timeText}>
                  {formatTimeRange(slot.start_time, slot.end_time)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusConfig.border}20` },
                ]}
              >
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {slot.elder ? (
              <View style={styles.assignment}>
                <Text style={styles.elderName}>
                  {slot.elder.first_name} {slot.elder.last_name}
                </Text>
                {slot.caregiver && (
                  <Text style={styles.caregiverName}>
                    Caregiver: {slot.caregiver.first_name}
                  </Text>
                )}
              </View>
            ) : (
              isAvailable && (
                <Pressable
                  style={styles.assignButton}
                  onPress={() => onAssign(slot)}
                >
                  <UserPlusIcon size={16} color="#3B82F6" />
                  <Text style={styles.assignButtonText}>Assign Visit</Text>
                </Pressable>
              )
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  slot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    ...createShadow(1, 0.05, 4, 2),
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  assignment: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  elderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  caregiverName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
