// HealthGuide Today's Schedule Component
// Horizontal scrolling list of today's visits

import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import Svg, { Path } from 'react-native-svg';
import { createShadow } from '@/theme/spacing';

interface Visit {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'missed';
  caregiver?: {
    first_name: string;
  };
  elder?: {
    first_name: string;
    last_name: string;
  };
}

interface Props {
  visits: Visit[];
}

function ClockIcon({ size = 14, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonIcon({ size = 12, color = '#9CA3AF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'scheduled':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'checked_in':
    case 'in_progress':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'completed':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'missed':
      return { bg: '#FEE2E2', text: '#991B1B' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

export function TodaySchedule({ visits }: Props) {
  if (visits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Today's Schedule</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No visits scheduled for today</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Text style={styles.count}>{visits.length} visits</Text>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <Pressable
              style={styles.visitCard}
              onPress={() => router.push(`/agency/visit/${item.id}` as any)}
            >
              <View style={styles.timeRow}>
                <ClockIcon size={14} color="#6B7280" />
                <Text style={styles.time}>
                  {format(new Date(item.scheduled_start), 'h:mm a')} -{' '}
                  {format(new Date(item.scheduled_end), 'h:mm a')}
                </Text>
              </View>

              <Text style={styles.elderName}>
                {item.elder?.first_name} {item.elder?.last_name}
              </Text>

              <View style={styles.caregiverRow}>
                <PersonIcon size={12} color="#9CA3AF" />
                <Text style={styles.caregiver}>
                  {item.caregiver?.first_name || 'Unassigned'}
                </Text>
              </View>

              <View
                style={[
                  styles.status,
                  { backgroundColor: statusStyle.bg },
                ]}
              >
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {formatStatus(item.status)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  count: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
  },
  visitCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    ...createShadow(1, 0.05, 4, 2),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
  },
  elderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  caregiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  caregiver: {
    fontSize: 14,
    color: '#6B7280',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
