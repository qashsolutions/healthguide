// HealthGuide Assignment Modal
// For assigning caregivers to elders on a time slot
// 3-step flow: select elder → select caregiver → select tasks

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';
import { XIcon, CheckIcon as CheckMarkIcon } from '@/components/icons';

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  is_available: boolean;
}

interface Elder {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  address: string;
}

interface TaskOption {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  slot: TimeSlot;
  onAssign: () => void;
}

type Step = 'elder' | 'caregiver' | 'tasks';

export function AssignmentModal({ visible, onClose, slot, onAssign }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('elder');
  const [elders, setElders] = useState<Elder[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [selectedElder, setSelectedElder] = useState<string | null>(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchElders();
      fetchCaregivers();
      fetchTasks();
    }
  }, [visible]);

  async function fetchElders() {
    setFetchingData(true);
    const { data, error } = await supabase
      .from('elders')
      .select('id, first_name, last_name, photo_url, address')
      .eq('agency_id', user?.agency_id)
      .eq('is_active', true)
      .order('first_name');

    if (data) setElders(data);
    setFetchingData(false);
  }

  async function fetchCaregivers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, photo_url')
      .eq('agency_id', user?.agency_id)
      .eq('role', 'caregiver')
      .eq('is_active', true)
      .order('first_name');

    if (data) {
      const caregiverList = data.map((cg) => ({
        ...cg,
        is_available: true,
      }));
      setCaregivers(caregiverList);
    }
  }

  async function fetchTasks() {
    if (!user?.agency_id) return;
    const { data, error } = await supabase
      .from('task_library')
      .select('id, name, description, category')
      .eq('agency_id', user.agency_id)
      .eq('is_active', true)
      .order('name');

    if (data) setTaskOptions(data);
  }

  function toggleTask(taskId: string) {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  async function handleAssign() {
    if (!selectedElder || !selectedCaregiver || selectedTasks.length === 0) return;

    setLoading(true);

    try {
      // Update time slot with assignment
      const { error: slotError } = await supabase
        .from('time_slots')
        .update({
          elder_id: selectedElder,
          caregiver_id: selectedCaregiver,
          status: 'assigned',
        })
        .eq('id', slot.id);

      if (slotError) throw slotError;

      // Create visit record
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          agency_id: user?.agency_id,
          elder_id: selectedElder,
          caregiver_id: selectedCaregiver,
          scheduled_date: slot.date,
          scheduled_start: `${slot.date}T${slot.start_time}`,
          scheduled_end: `${slot.date}T${slot.end_time}`,
          status: 'scheduled',
        })
        .select('id')
        .single();

      if (visitError) throw visitError;

      // Create visit_tasks with task_id FK
      if (visit) {
        const visitTasks = selectedTasks.map((taskId) => ({
          visit_id: visit.id,
          task_id: taskId,
          status: 'pending',
        }));

        const { error: tasksError } = await supabase
          .from('visit_tasks')
          .insert(visitTasks);

        if (tasksError) throw tasksError;
      }

      onAssign();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create assignment');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep('elder');
    setSelectedElder(null);
    setSelectedCaregiver(null);
    setSelectedTasks([]);
    onClose();
  }

  function renderElderItem({ item }: { item: Elder }) {
    const isSelected = selectedElder === item.id;

    return (
      <Pressable
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => setSelectedElder(item.id)}
      >
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {item.first_name[0]}
              {item.last_name[0]}
            </Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.itemDetail} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        {isSelected && <CheckMarkIcon color={colors.success[500]} />}
      </Pressable>
    );
  }

  function renderCaregiverItem({ item }: { item: Caregiver }) {
    const isSelected = selectedCaregiver === item.id;

    return (
      <Pressable
        style={[
          styles.listItem,
          isSelected && styles.listItemSelected,
          !item.is_available && styles.listItemDisabled,
        ]}
        onPress={() => item.is_available && setSelectedCaregiver(item.id)}
        disabled={!item.is_available}
      >
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {item.first_name[0]}
              {item.last_name[0]}
            </Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text
            style={[
              styles.itemDetail,
              !item.is_available && styles.unavailableText,
            ]}
          >
            {item.is_available ? 'Available' : 'Not available'}
          </Text>
        </View>
        {isSelected && <CheckMarkIcon color={colors.success[500]} />}
      </Pressable>
    );
  }

  function renderTaskItem({ item }: { item: TaskOption }) {
    const isSelected = selectedTasks.includes(item.id);

    return (
      <Pressable
        style={[styles.taskItem, isSelected && styles.taskItemSelected]}
        onPress={() => toggleTask(item.id)}
      >
        <View style={[styles.taskCheckbox, isSelected && styles.taskCheckboxSelected]}>
          {isSelected && <CheckMarkIcon size={16} color={colors.white} />}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDetail}>{item.description}</Text>
        </View>
      </Pressable>
    );
  }

  const stepLabels: Record<Step, string> = {
    elder: 'Select Elder',
    caregiver: 'Select Caregiver',
    tasks: 'Select Tasks',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{stepLabels[step]}</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <XIcon color={colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Step Indicator */}
        <View style={styles.steps}>
          <View
            style={[
              styles.step,
              step === 'elder' ? styles.stepActive : styles.stepCompleted,
            ]}
          >
            <Text style={styles.stepText}>1. Elder</Text>
          </View>
          <View style={styles.stepDivider} />
          <View
            style={[
              styles.step,
              step === 'caregiver'
                ? styles.stepActive
                : step === 'tasks'
                  ? styles.stepCompleted
                  : undefined,
            ]}
          >
            <Text style={styles.stepText}>2. Caregiver</Text>
          </View>
          <View style={styles.stepDivider} />
          <View style={[styles.step, step === 'tasks' && styles.stepActive]}>
            <Text style={styles.stepText}>3. Tasks</Text>
          </View>
        </View>

        {/* List */}
        {step === 'elder' && (
          <FlatList
            data={elders}
            keyExtractor={(item) => item.id}
            renderItem={renderElderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No elders found</Text>
              </View>
            }
          />
        )}
        {step === 'caregiver' && (
          <FlatList
            data={caregivers}
            keyExtractor={(item) => item.id}
            renderItem={renderCaregiverItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No caregivers found</Text>
              </View>
            }
          />
        )}
        {step === 'tasks' && (
          <>
            <Text style={styles.taskHint}>
              Select at least one task for this visit
            </Text>
            <FlatList
              data={taskOptions}
              keyExtractor={(item) => item.id}
              renderItem={renderTaskItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tasks available</Text>
                </View>
              }
            />
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {step === 'elder' && (
            <Button
              title="Next: Select Caregiver"
              onPress={() => setStep('caregiver')}
              disabled={!selectedElder}
              style={styles.actionButton}
            />
          )}
          {step === 'caregiver' && (
            <View style={styles.actionRow}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep('elder')}
                style={styles.backButton}
              />
              <Button
                title="Next: Select Tasks"
                onPress={() => setStep('tasks')}
                disabled={!selectedCaregiver}
                style={styles.actionButton}
              />
            </View>
          )}
          {step === 'tasks' && (
            <View style={styles.actionRow}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep('caregiver')}
                style={styles.backButton}
              />
              <Button
                title="Assign Visit"
                onPress={handleAssign}
                loading={loading}
                disabled={selectedTasks.length === 0}
                style={styles.actionButton}
              />
            </View>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[2],
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.screenPadding,
    gap: spacing[2],
  },
  step: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.neutral[100],
  },
  stepActive: {
    backgroundColor: colors.primary[500],
  },
  stepCompleted: {
    backgroundColor: colors.success[100],
  },
  stepText: {
    ...typography.styles.bodySmall,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral[200],
  },
  list: {
    padding: layout.screenPadding,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.screenPadding,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  listItemSelected: {
    backgroundColor: colors.primary[100],
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemDetail: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  unavailableText: {
    color: colors.error[500],
  },
  taskHint: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[1],
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.screenPadding,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  taskItemSelected: {
    backgroundColor: colors.primary[100],
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  emptyContainer: {
    padding: spacing[10],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.styles.bodySmall,
    color: colors.neutral[400],
  },
  actions: {
    padding: layout.screenPadding,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  backButton: {
    flex: 0.4,
  },
  actionButton: {
    flex: 1,
  },
});
