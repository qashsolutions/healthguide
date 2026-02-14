// HealthGuide Caregiver Assignment Card
// Large touch-friendly card for daily assignments

import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';

interface Elder {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  address: string;
}

interface Assignment {
  id: string;
  elder: Elder;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'missed';
  task_count: number;
}

interface Props {
  assignment: Assignment;
  onPress: () => void;
}

// Icons
function ClockIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MapPinIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function TaskIcon({ size = 16, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon({ size = 14, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3l14 9-14 9V3z" stroke={color} strokeWidth={2} fill={color} />
    </Svg>
  );
}

function CheckCircleIcon({ size = 14, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="m9 11 3 3L22 4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function getStatusConfig(status: Assignment['status']) {
  switch (status) {
    case 'scheduled':
      return {
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        label: 'TAP TO CHECK IN',
        icon: PlayIcon,
      };
    case 'checked_in':
    case 'in_progress':
      return {
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        label: 'IN PROGRESS',
        icon: TaskIcon,
      };
    case 'completed':
      return {
        color: '#10B981',
        bgColor: '#D1FAE5',
        label: 'COMPLETED',
        icon: CheckCircleIcon,
      };
    case 'missed':
      return {
        color: '#EF4444',
        bgColor: '#FEE2E2',
        label: 'MISSED',
        icon: ClockIcon,
      };
    default:
      return {
        color: '#6B7280',
        bgColor: '#F3F4F6',
        label: 'UNKNOWN',
        icon: ClockIcon,
      };
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, 'h:mm a');
}

export function AssignmentCard({ assignment, onPress }: Props) {
  const { elder, start_time, end_time, status, task_count } = assignment;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <Pressable
      style={[styles.card, { borderLeftColor: statusConfig.color }]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Visit with ${elder.first_name} ${elder.last_name}, ${statusConfig.label}`}
    >
      <View style={styles.elderInfo}>
        {elder.avatar_url ? (
          <Image source={{ uri: elder.avatar_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitials}>
              {elder.first_name[0]}
              {elder.last_name[0]}
            </Text>
          </View>
        )}

        <View style={styles.details}>
          <Text style={styles.elderName}>
            {elder.first_name} {elder.last_name}
          </Text>

          <View style={styles.timeRow}>
            <ClockIcon size={16} color="#6B7280" />
            <Text style={styles.timeText}>
              {formatTime(start_time)} - {formatTime(end_time)}
            </Text>
          </View>

          <View style={styles.addressRow}>
            <MapPinIcon size={16} color="#6B7280" />
            <Text style={styles.addressText} numberOfLines={1}>
              {elder.address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.taskCount}>
          <TaskIcon size={16} color="#6B7280" />
          <Text style={styles.taskCountText}>{task_count} tasks</Text>
        </View>

        <View
          style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}
        >
          <StatusIcon size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Minimum 72px touch target via padding
    minHeight: 140,
  },
  elderInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoInitials: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  elderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  taskCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36, // Larger touch target
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
