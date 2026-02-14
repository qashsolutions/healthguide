// HealthGuide New Assignment Screen
// Per healthguide-agency/scheduling skill - Create visit assignments

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { format, parse } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CalendarIcon, ClockIcon, PersonIcon, CheckIcon } from '@/components/icons';

interface Elder {
  id: string;
  full_name: string;
  preferred_name: string | null;
}

interface Caregiver {
  id: string;
  full_name: string;
}

interface TaskItem {
  id: string;
  name: string;
  category: string;
  icon: string;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function NewAssignmentScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(dateParam || format(new Date(), 'yyyy-MM-dd'));
  const [selectedElderId, setSelectedElderId] = useState<string | null>(null);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [elders, setElders] = useState<Elder[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.agency_id) {
      Promise.all([fetchElders(), fetchCaregivers(), fetchTasks()]).then(() =>
        setLoading(false)
      );
    }
  }, [user?.agency_id]);

  // When elder changes, pre-select their preferred tasks
  useEffect(() => {
    if (selectedElderId) fetchElderTaskPreferences(selectedElderId);
  }, [selectedElderId]);

  async function fetchElders() {
    const { data } = await supabase
      .from('elders')
      .select('id, full_name, preferred_name')
      .eq('agency_id', user!.agency_id)
      .eq('is_active', true)
      .order('full_name');

    if (data) setElders(data);
  }

  async function fetchCaregivers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('agency_id', user!.agency_id)
      .eq('role', 'caregiver')
      .eq('is_active', true)
      .order('full_name');

    if (data) setCaregivers(data);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('task_library')
      .select('id, name, category, icon')
      .eq('agency_id', user!.agency_id)
      .eq('is_active', true)
      .order('category')
      .order('name');

    if (data) setTasks(data);
  }

  async function fetchElderTaskPreferences(elderId: string) {
    const { data } = await supabase
      .from('elder_task_preferences')
      .select('task_id')
      .eq('elder_id', elderId);

    if (data && data.length > 0) {
      setSelectedTaskIds(data.map((d) => d.task_id));
    }
  }

  function toggleTask(taskId: string) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }

  function validate(): string | null {
    if (!selectedElderId) return 'Please select an elder';
    if (!selectedCaregiverId) return 'Please select a caregiver';
    if (startTime >= endTime) return 'End time must be after start time';
    if (selectedTaskIds.length === 0) return 'Please select at least one task';
    return null;
  }

  async function handleSubmit() {
    const error = validate();
    if (error) {
      Alert.alert('Validation', error);
      return;
    }

    setSaving(true);
    try {
      // Check for overlapping visits for the same caregiver
      const { data: existing } = await supabase
        .from('visits')
        .select('id')
        .eq('caregiver_id', selectedCaregiverId!)
        .eq('scheduled_date', selectedDate)
        .neq('status', 'cancelled')
        .or(`and(scheduled_start.lt.${endTime},scheduled_end.gt.${startTime})`);

      if (existing && existing.length > 0) {
        Alert.alert(
          'Schedule Conflict',
          'This caregiver already has a visit during this time. Please choose a different time or caregiver.'
        );
        setSaving(false);
        return;
      }

      // Insert visit
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          agency_id: user!.agency_id,
          caregiver_id: selectedCaregiverId,
          elder_id: selectedElderId,
          scheduled_date: selectedDate,
          scheduled_start: startTime,
          scheduled_end: endTime,
          status: 'scheduled',
        })
        .select('id')
        .single();

      if (visitError) throw visitError;

      // Bulk insert visit tasks
      if (visit && selectedTaskIds.length > 0) {
        const visitTasks = selectedTaskIds.map((taskId, index) => ({
          visit_id: visit.id,
          task_id: taskId,
          sort_order: index,
        }));

        const { error: tasksError } = await supabase
          .from('visit_tasks')
          .insert(visitTasks);

        if (tasksError) throw tasksError;
      }

      Alert.alert('Success', 'Assignment created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      Alert.alert('Error', err.message || 'Could not create assignment');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'New Assignment' }} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={roleColors.agency_owner} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const displayDate = parse(selectedDate, 'yyyy-MM-dd', new Date());

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Assignment',
          headerBackTitle: 'Schedule',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* Date */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarIcon size={20} color={roleColors.agency_owner} />
              <Text style={styles.sectionTitle}>Date</Text>
            </View>
            <Text style={styles.dateText}>
              {format(displayDate, 'EEEE, MMMM d, yyyy')}
            </Text>
          </Card>

          {/* Elder Selection */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <PersonIcon size={20} color={roleColors.careseeker} />
              <Text style={styles.sectionTitle}>Elder</Text>
            </View>
            {elders.length === 0 ? (
              <Text style={styles.emptyText}>No active elders found</Text>
            ) : (
              <View style={styles.selectionList}>
                {elders.map((elder) => (
                  <Pressable
                    key={elder.id}
                    style={[
                      styles.selectionItem,
                      selectedElderId === elder.id && styles.selectionItemSelected,
                    ]}
                    onPress={() => setSelectedElderId(elder.id)}
                  >
                    {selectedElderId === elder.id && (
                      <CheckIcon size={16} color={colors.white} />
                    )}
                    <Text
                      style={[
                        styles.selectionText,
                        selectedElderId === elder.id && styles.selectionTextSelected,
                      ]}
                    >
                      {elder.preferred_name || elder.full_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          {/* Caregiver Selection */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <PersonIcon size={20} color={roleColors.caregiver} />
              <Text style={styles.sectionTitle}>Caregiver</Text>
            </View>
            {caregivers.length === 0 ? (
              <Text style={styles.emptyText}>No active caregivers found</Text>
            ) : (
              <View style={styles.selectionList}>
                {caregivers.map((cg) => (
                  <Pressable
                    key={cg.id}
                    style={[
                      styles.selectionItem,
                      selectedCaregiverId === cg.id && styles.selectionItemSelected,
                    ]}
                    onPress={() => setSelectedCaregiverId(cg.id)}
                  >
                    {selectedCaregiverId === cg.id && (
                      <CheckIcon size={16} color={colors.white} />
                    )}
                    <Text
                      style={[
                        styles.selectionText,
                        selectedCaregiverId === cg.id && styles.selectionTextSelected,
                      ]}
                    >
                      {cg.full_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          {/* Time Selection */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <ClockIcon size={20} color={roleColors.agency_owner} />
              <Text style={styles.sectionTitle}>Time</Text>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Start</Text>
                <ScrollView style={styles.timePicker} nestedScrollEnabled>
                  {TIME_OPTIONS.map((time) => (
                    <Pressable
                      key={time}
                      style={[
                        styles.timeOption,
                        startTime === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          startTime === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {formatTimeDisplay(time)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeDivider}>to</Text>

              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>End</Text>
                <ScrollView style={styles.timePicker} nestedScrollEnabled>
                  {TIME_OPTIONS.map((time) => (
                    <Pressable
                      key={time}
                      style={[
                        styles.timeOption,
                        endTime === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setEndTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          endTime === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {formatTimeDisplay(time)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {startTime >= endTime && (
              <Text style={styles.timeError}>End time must be after start time</Text>
            )}
          </Card>

          {/* Task Selection */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <CheckIcon size={20} color={roleColors.agency_owner} />
              <Text style={styles.sectionTitle}>
                Tasks ({selectedTaskIds.length} selected)
              </Text>
            </View>
            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks in library</Text>
            ) : (
              <View style={styles.taskGrid}>
                {tasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  return (
                    <Pressable
                      key={task.id}
                      style={[styles.taskChip, isSelected && styles.taskChipSelected]}
                      onPress={() => toggleTask(task.id)}
                    >
                      {isSelected && <CheckIcon size={14} color={colors.white} />}
                      <Text
                        style={[
                          styles.taskChipText,
                          isSelected && styles.taskChipTextSelected,
                        ]}
                      >
                        {task.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Submit */}
          <Button
            title="Create Assignment"
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            loading={saving}
            fullWidth
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  section: {
    padding: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  dateText: {
    ...typography.styles.bodyLarge,
    color: colors.primary[600],
    fontWeight: '600',
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
  selectionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  selectionItemSelected: {
    backgroundColor: roleColors.agency_owner,
    borderColor: roleColors.agency_owner,
  },
  selectionText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  selectionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  timePicker: {
    height: 180,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
  },
  timeOption: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  timeOptionSelected: {
    backgroundColor: roleColors.agency_owner,
  },
  timeOptionText: {
    ...typography.styles.body,
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 14,
  },
  timeOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  timeDivider: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing[8],
  },
  timeError: {
    ...typography.styles.caption,
    color: colors.error[500],
    marginTop: spacing[2],
    textAlign: 'center',
  },
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  taskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  taskChipSelected: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  taskChipText: {
    ...typography.styles.caption,
    color: colors.text.primary,
  },
  taskChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: spacing[8],
  },
});
