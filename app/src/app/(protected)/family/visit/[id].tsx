// HealthGuide Family Visit Detail Screen
// Detailed view of a specific visit for family members

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday } from 'date-fns';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';

interface VisitDetail {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  notes: string | null;
  caregiver: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  elder: {
    first_name: string;
    last_name: string;
    address: string;
  };
  tasks: VisitTask[];
  check_in_location: {
    latitude: number;
    longitude: number;
  } | null;
}

interface VisitTask {
  id: string;
  task_name: string;
  status: 'pending' | 'completed' | 'skipped';
  completed_at: string | null;
  skip_reason: string | null;
  notes: string | null;
}

function BackIcon({ size = 24, color = '#1F2937' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon({ size = 20, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ size = 20, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
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

function XCircleIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M15 9l-6 6M9 9l6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ size = 20, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function PhoneIcon({ size = 20, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function FamilyVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, [id]);

  async function loadVisit() {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_start,
          scheduled_end,
          actual_start,
          actual_end,
          status,
          notes,
          check_in_location,
          caregiver:user_profiles!caregiver_id (
            first_name,
            last_name,
            phone
          ),
          elder:elders!elder_id (
            first_name,
            last_name,
            address
          ),
          visit_tasks (
            id,
            task_name,
            status,
            completed_at,
            skip_reason,
            notes
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform Supabase joins (arrays) to objects
      const transformed = {
        ...data,
        caregiver: Array.isArray(data.caregiver) ? data.caregiver[0] : data.caregiver,
        elder: Array.isArray(data.elder) ? data.elder[0] : data.elder,
        tasks: data.visit_tasks || [],
      };
      setVisit(transformed as VisitDetail);
    } catch (error) {
      console.error('Error loading visit:', error);
    }

    setLoading(false);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  }

  function getStatusConfig(status: string) {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: '#10B981', bgColor: '#ECFDF5' };
      case 'in_progress':
        return { label: 'In Progress', color: '#3B82F6', bgColor: '#EFF6FF' };
      case 'scheduled':
        return { label: 'Scheduled', color: '#6B7280', bgColor: '#F3F4F6' };
      case 'missed':
        return { label: 'Missed', color: '#EF4444', bgColor: '#FEF2F2' };
      default:
        return { label: status, color: '#6B7280', bgColor: '#F3F4F6' };
    }
  }

  function getTaskIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="#10B981" />;
      case 'skipped':
        return <XCircleIcon color="#F59E0B" />;
      default:
        return <ClockIcon color="#9CA3AF" />;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <BackIcon />
          </Pressable>
          <Text style={styles.title}>Visit Not Found</Text>
        </View>
        <View style={styles.loading}>
          <Text style={styles.errorText}>This visit could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(visit.status);
  const completedTasks = visit.tasks.filter((t) => t.status === 'completed').length;
  const skippedTasks = visit.tasks.filter((t) => t.status === 'skipped').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon />
        </Pressable>
        <Text style={styles.title}>Visit Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll}>
        {/* Date and Status */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatDate(visit.scheduled_date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Caregiver Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Caregiver</Text>
          <View style={styles.caregiverInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {visit.caregiver.first_name[0]}{visit.caregiver.last_name[0]}
              </Text>
            </View>
            <View style={styles.caregiverDetails}>
              <Text style={styles.caregiverName}>
                {visit.caregiver.first_name} {visit.caregiver.last_name}
              </Text>
              {visit.caregiver.phone && (
                <View style={styles.phoneRow}>
                  <PhoneIcon size={16} />
                  <Text style={styles.phoneText}>{visit.caregiver.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Time Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit Time</Text>

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Scheduled</Text>
            <Text style={styles.timeValue}>
              {format(new Date(`2000-01-01T${visit.scheduled_start}`), 'h:mm a')} -{' '}
              {format(new Date(`2000-01-01T${visit.scheduled_end}`), 'h:mm a')}
            </Text>
          </View>

          {visit.actual_start && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Check-in</Text>
              <Text style={[styles.timeValue, styles.actualTime]}>
                {format(new Date(visit.actual_start), 'h:mm a')}
              </Text>
            </View>
          )}

          {visit.actual_end && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Check-out</Text>
              <Text style={[styles.timeValue, styles.actualTime]}>
                {format(new Date(visit.actual_end), 'h:mm a')}
              </Text>
            </View>
          )}

          {visit.check_in_location && (
            <View style={styles.locationRow}>
              <MapPinIcon size={16} />
              <Text style={styles.locationText}>Location verified at check-in</Text>
            </View>
          )}
        </View>

        {/* Tasks Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tasks</Text>
            <Text style={styles.taskSummary}>
              {completedTasks}/{visit.tasks.length} completed
              {skippedTasks > 0 && ` • ${skippedTasks} skipped`}
            </Text>
          </View>

          {visit.tasks.length > 0 ? (
            <View style={styles.taskList}>
              {visit.tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskIcon}>{getTaskIcon(task.status)}</View>
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskName,
                        task.status === 'completed' && styles.taskCompleted,
                        task.status === 'skipped' && styles.taskSkipped,
                      ]}
                    >
                      {task.task_name}
                    </Text>
                    {task.status === 'completed' && task.completed_at && (
                      <Text style={styles.taskTime}>
                        Completed at {format(new Date(task.completed_at), 'h:mm a')}
                      </Text>
                    )}
                    {task.status === 'skipped' && task.skip_reason && (
                      <Text style={styles.taskReason}>
                        Skipped: {task.skip_reason}
                      </Text>
                    )}
                    {task.notes && (
                      <Text style={styles.taskNotes}>{task.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noTasks}>No tasks assigned for this visit</Text>
          )}
        </View>

        {/* Notes Card */}
        {visit.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Visit Notes</Text>
            <Text style={styles.notesText}>{visit.notes}</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  dateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 14,
    color: '#10B981',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  actualTime: {
    color: '#10B981',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  locationText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  taskSummary: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    color: '#1F2937',
  },
  taskCompleted: {
    color: '#10B981',
  },
  taskSkipped: {
    color: '#F59E0B',
  },
  taskTime: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  taskReason: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  taskNotes: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noTasks: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  notesText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 24,
  },
});
