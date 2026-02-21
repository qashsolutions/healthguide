// HealthGuide New Assignment Screen
// Flow: Date → Elder → Tasks (autocomplete, max 3) → Caregiver (ranked) → Time → Submit
// All sections collapsible; elder & tasks use autocomplete dropdowns

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
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

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const MAX_TASKS = 3;

interface Elder {
  id: string;
  first_name: string;
  last_name: string;
  zip_code: string;
}

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  capabilities: string[];
  zip_code: string;
  matchScore?: number;
  zipMatch?: boolean;
}

interface TaskItem {
  id: string;
  name: string;
  category: string;
  icon: string;
}

const CATEGORY_TO_CAPABILITIES: Record<string, string[]> = {
  companionship: ['companionship', 'Companionship'],
  nutrition: ['meal_preparation', 'Meal Preparation'],
  housekeeping: ['light_housekeeping', 'Light Housekeeping'],
  transportation: ['transportation', 'Transportation'],
  errands: ['errands', 'Errands & Shopping'],
  pet_care: ['pet_care', 'Pet Care'],
  lawn_yard: ['lawn_yard', 'Lawn & Yard Care'],
  education: ['tutoring', 'Tutoring'],
};

const LIABILITY_CATEGORIES = new Set(['medication', 'nutrition', 'vitals']);

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

function zipProximity(elderZip: string, caregiverZip: string): number {
  if (!elderZip || !caregiverZip) return 0;
  if (elderZip === caregiverZip) return 2;
  if (elderZip.slice(0, 3) === caregiverZip.slice(0, 3)) return 1;
  return 0;
}

// --- Collapsible Section ---
function SectionCard({
  icon,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        {icon}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && !expanded ? (
            <Text style={styles.sectionSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      </Pressable>
      {expanded && <View style={styles.sectionBody}>{children}</View>}
    </Card>
  );
}

export default function NewAssignmentScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // Form state
  const [selectedDate] = useState(dateParam || format(new Date(), 'yyyy-MM-dd'));
  const [selectedElderId, setSelectedElderId] = useState<string | null>(null);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Search state
  const [taskSearch, setTaskSearch] = useState('');
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  // Section collapse state
  const [expandedSection, setExpandedSection] = useState<string>('date');

  // Data
  const [elders, setElders] = useState<Elder[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleSection = useCallback((section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(prev => prev === section ? '' : section);
  }, []);

  useEffect(() => {
    if (user?.agency_id) {
      Promise.all([fetchElders(), fetchCaregivers(), fetchTasks()]).then(() =>
        setLoading(false)
      );
    }
  }, [user?.agency_id]);

  useEffect(() => {
    if (selectedElderId) fetchElderTaskPreferences(selectedElderId);
  }, [selectedElderId]);

  useEffect(() => {
    setSelectedCaregiverId(null);
    setDisclaimerAccepted(false);
  }, [selectedTaskIds]);

  // --- Computed values ---
  const selectedElder = useMemo(
    () => elders.find(e => e.id === selectedElderId) || null,
    [elders, selectedElderId]
  );

  const taskSuggestions = useMemo(() => {
    if (!taskSearch.trim()) return [];
    const q = taskSearch.toLowerCase();
    return tasks.filter(
      t => !selectedTaskIds.includes(t.id) && t.name.toLowerCase().includes(q)
    );
  }, [taskSearch, tasks, selectedTaskIds]);

  const selectedTasks = useMemo(
    () => tasks.filter(t => selectedTaskIds.includes(t.id)),
    [selectedTaskIds, tasks]
  );

  const requiredCapabilities = useMemo(() => {
    const caps = new Set<string>();
    selectedTasks.forEach(t => {
      (CATEGORY_TO_CAPABILITIES[t.category] || []).forEach(c => caps.add(c.toLowerCase()));
    });
    return caps;
  }, [selectedTasks]);

  const hasLiabilityTasks = useMemo(
    () => selectedTasks.some(t => LIABILITY_CATEGORIES.has(t.category)),
    [selectedTasks]
  );

  const elderZip = selectedElder?.zip_code || '';

  const sortedCaregivers = useMemo(() => {
    return [...caregivers]
      .map(cg => {
        const cgCaps = (cg.capabilities || []).map(c => c.toLowerCase());
        const matchCount = requiredCapabilities.size > 0
          ? [...requiredCapabilities].filter(rc => cgCaps.includes(rc)).length
          : 0;
        const zipScore = zipProximity(elderZip, cg.zip_code);
        return { ...cg, matchScore: matchCount, zipMatch: zipScore > 0 };
      })
      .sort((a, b) => {
        const zipA = zipProximity(elderZip, a.zip_code);
        const zipB = zipProximity(elderZip, b.zip_code);
        if (zipB !== zipA) return zipB - zipA;
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [caregivers, requiredCapabilities, elderZip]);

  // --- Data fetching ---
  async function fetchElders() {
    const { data } = await supabase
      .from('elders')
      .select('id, first_name, last_name, zip_code')
      .eq('agency_id', user!.agency_id)
      .eq('is_active', true)
      .order('first_name');
    if (data) setElders(data);
  }

  async function fetchCaregivers() {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('agency_id', user!.agency_id)
      .eq('role', 'caregiver')
      .eq('is_active', true)
      .order('first_name');

    const { data: capData } = await supabase
      .from('caregiver_agency_links')
      .select('caregiver_profile_id, caregiver_profiles!inner(user_id, capabilities, zip_code)')
      .eq('agency_id', user!.agency_id);

    const capMap = new Map<string, string[]>();
    const zipMap = new Map<string, string>();
    capData?.forEach((link: any) => {
      const cp = Array.isArray(link.caregiver_profiles)
        ? link.caregiver_profiles[0]
        : link.caregiver_profiles;
      if (cp?.user_id) {
        capMap.set(cp.user_id, cp.capabilities || []);
        zipMap.set(cp.user_id, cp.zip_code || '');
      }
    });

    if (profiles) {
      setCaregivers(profiles.map(p => ({
        ...p,
        capabilities: capMap.get(p.id) || [],
        zip_code: zipMap.get(p.id) || '',
      })));
    }
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
      setSelectedTaskIds(data.map(d => d.task_id).slice(0, MAX_TASKS));
    }
  }

  // --- Actions ---
  function selectElder(elder: Elder) {
    setSelectedElderId(elder.id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection('tasks');
  }

  function clearElder() {
    setSelectedElderId(null);
    setSelectedTaskIds([]);
  }

  function selectTask(taskId: string) {
    if (selectedTaskIds.length >= MAX_TASKS) return;
    setSelectedTaskIds(prev => [...prev, taskId]);
    setTaskSearch('');
    setShowTaskDropdown(false);
    // auto-expand caregiver when max tasks reached
    if (selectedTaskIds.length + 1 >= MAX_TASKS) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSection('caregiver');
    }
  }

  function removeTask(taskId: string) {
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  }

  async function addNewTask(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Normalize to Title Case: "dRiving" → "Driving", "meal prep" → "Meal Prep"
    const normalized = trimmed
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());

    // Check for case-insensitive duplicate in existing tasks
    const duplicate = tasks.find(t => t.name.toLowerCase() === normalized.toLowerCase());
    if (duplicate) {
      // Already exists — just select it
      if (!selectedTaskIds.includes(duplicate.id)) {
        selectTask(duplicate.id);
      }
      setTaskSearch('');
      setShowTaskDropdown(false);
      return;
    }

    const { data, error } = await supabase
      .from('task_library')
      .insert({
        agency_id: user!.agency_id,
        name: normalized,
        category: 'general',
        icon: 'clipboard',
        is_active: true,
      })
      .select('id, name, category, icon')
      .single();

    if (error) {
      Alert.alert('Error', 'Could not add task: ' + error.message);
      return;
    }
    if (data) {
      setTasks(prev => [...prev, data]);
      selectTask(data.id);
    }
    setTaskSearch('');
    setShowTaskDropdown(false);
  }

  function validate(): string | null {
    if (!selectedElderId) return 'Please select an elder';
    if (selectedTaskIds.length === 0) return 'Please select at least one task';
    if (!selectedCaregiverId) return 'Please select a caregiver';
    if (startTime >= endTime) return 'End time must be after start time';
    return null;
  }

  function handleSubmitPress() {
    const error = validate();
    if (error) { Alert.alert('Validation', error); return; }
    if (hasLiabilityTasks && !disclaimerAccepted) {
      setShowDisclaimerModal(true);
      return;
    }
    handleSubmit();
  }

  function handleDisclaimerAccept() {
    setDisclaimerAccepted(true);
    setShowDisclaimerModal(false);
    handleSubmit();
  }

  async function handleSubmit() {
    const error = validate();
    if (error) { Alert.alert('Validation', error); return; }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('visits')
        .select('id')
        .eq('caregiver_id', selectedCaregiverId!)
        .eq('scheduled_date', selectedDate)
        .neq('status', 'cancelled')
        .or(`and(scheduled_start.lt.${endTime},scheduled_end.gt.${startTime})`);

      if (existing && existing.length > 0) {
        Alert.alert('Schedule Conflict', 'This caregiver already has a visit during this time.');
        setSaving(false);
        return;
      }

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          agency_id: user!.agency_id,
          caregiver_id: selectedCaregiverId,
          elder_id: selectedElderId,
          scheduled_date: selectedDate,
          scheduled_start: startTime,
          scheduled_end: endTime,
          status: 'pending_acceptance',
        })
        .select('id')
        .single();
      if (visitError) throw visitError;

      if (visit && selectedTaskIds.length > 0) {
        const visitTasks = selectedTaskIds.map((taskId, i) => ({
          visit_id: visit.id, task_id: taskId, sort_order: i,
        }));
        const { error: te } = await supabase.from('visit_tasks').insert(visitTasks);
        if (te) throw te;
      }

      Alert.alert('Success', 'Assignment created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create assignment');
    }
    setSaving(false);
  }

  // --- Render ---
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
  const tasksSelected = selectedTaskIds.length > 0;
  const showMatch = tasksSelected && requiredCapabilities.size > 0;
  const noExactTaskMatch = showTaskDropdown && taskSearch.trim().length > 0 && taskSuggestions.length === 0;

  return (
    <>
      <Stack.Screen options={{ title: 'New Assignment', headerBackTitle: 'Schedule' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Date — always visible, not collapsible */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarIcon size={20} color={roleColors.agency_owner} />
              <Text style={styles.sectionTitle}>Date</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.dateText}>
                {format(displayDate, 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
          </Card>

          {/* Elder — tap-to-open dropdown */}
          <SectionCard
            icon={<PersonIcon size={20} color={roleColors.careseeker} />}
            title="Elder"
            subtitle={selectedElder ? `${selectedElder.first_name} ${selectedElder.last_name}` : undefined}
            expanded={expandedSection === 'elder'}
            onToggle={() => toggleSection('elder')}
          >
            {elders.length === 0 ? (
              <Text style={styles.emptyText}>No active elders found</Text>
            ) : (
              <>
                {/* Selected elder chip */}
                {selectedElder && (
                  <View style={styles.selectedChipRow}>
                    <View style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>
                        {selectedElder.first_name} {selectedElder.last_name}
                      </Text>
                      <Pressable onPress={clearElder} hitSlop={8} style={styles.removeBtn}>
                        <Text style={styles.removeBtnX}>x</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                {/* Scrollable elder list */}
                <ScrollView style={styles.elderPicker} nestedScrollEnabled>
                  {elders.map(elder => {
                    const isSelected = selectedElderId === elder.id;
                    return (
                      <Pressable
                        key={elder.id}
                        style={[styles.elderOption, isSelected && styles.elderOptionSelected]}
                        onPress={() => selectElder(elder)}
                      >
                        <Text style={[styles.elderOptionText, isSelected && styles.elderOptionTextSelected]}>
                          {elder.first_name} {elder.last_name}
                        </Text>
                        {elder.zip_code ? (
                          <Text style={[styles.elderOptionZip, isSelected && styles.elderOptionTextSelected]}>
                            {elder.zip_code}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </SectionCard>

          {/* Tasks — autocomplete, max 3, add-to-db */}
          <SectionCard
            icon={<CheckIcon size={20} color={roleColors.agency_owner} />}
            title={`Tasks (${selectedTaskIds.length}/${MAX_TASKS})`}
            subtitle={selectedTasks.map(t => t.name).join(', ') || undefined}
            expanded={expandedSection === 'tasks'}
            onToggle={() => toggleSection('tasks')}
          >
            {selectedTasks.length > 0 && (
              <View style={styles.selectedChipRow}>
                {selectedTasks.map(task => (
                  <View key={task.id} style={[styles.selectedChip, styles.taskChipGreen]}>
                    <Text style={styles.selectedChipText}>{task.name}</Text>
                    <Pressable onPress={() => removeTask(task.id)} hitSlop={8} style={styles.removeBtn}>
                      <Text style={styles.removeBtnX}>x</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {selectedTaskIds.length < MAX_TASKS ? (
              <View style={styles.autocompleteContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={selectedTaskIds.length === 0
                    ? 'Search tasks...'
                    : `Add ${MAX_TASKS - selectedTaskIds.length} more...`}
                  placeholderTextColor={colors.text.tertiary}
                  value={taskSearch}
                  onChangeText={text => {
                    setTaskSearch(text);
                    setShowTaskDropdown(text.trim().length > 0);
                  }}
                  onFocus={() => { if (taskSearch.trim()) setShowTaskDropdown(true); }}
                />
                {showTaskDropdown && taskSuggestions.length > 0 && (
                  <View style={styles.dropdownList}>
                    {taskSuggestions.slice(0, 6).map(task => (
                      <Pressable
                        key={task.id}
                        style={styles.dropdownItem}
                        onPress={() => selectTask(task.id)}
                      >
                        <Text style={styles.dropdownItemText}>{task.name}</Text>
                        <Text style={styles.dropdownItemHint}>{task.category.replace(/_/g, ' ')}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {noExactTaskMatch && (
                  <View style={styles.dropdownList}>
                    <Pressable
                      style={[styles.dropdownItem, styles.addNewItem]}
                      onPress={() => addNewTask(taskSearch)}
                    >
                      <Text style={styles.addNewText}>+ Add "{taskSearch.trim()}" as new task</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.hintText}>Maximum {MAX_TASKS} tasks selected</Text>
            )}
          </SectionCard>

          {/* Liability Warning */}
          {hasLiabilityTasks && (
            <View style={styles.liabilityBanner}>
              <Text style={styles.liabilityTitle}>Medical-Adjacent Tasks Selected</Text>
              <Text style={styles.liabilityText}>
                Tasks like feeding, medication, and personal care require appropriate
                qualifications. HealthGuide does not verify caregiver licenses.
                The elder and their family assume full responsibility.
              </Text>
            </View>
          )}

          {/* Caregiver — ranked list */}
          <SectionCard
            icon={<PersonIcon size={20} color={roleColors.caregiver} />}
            title="Caregiver"
            subtitle={
              sortedCaregivers.find(c => c.id === selectedCaregiverId)
                ? `${sortedCaregivers.find(c => c.id === selectedCaregiverId)!.first_name} ${sortedCaregivers.find(c => c.id === selectedCaregiverId)!.last_name}`
                : undefined
            }
            expanded={expandedSection === 'caregiver'}
            onToggle={() => toggleSection('caregiver')}
          >
            {caregivers.length === 0 ? (
              <Text style={styles.emptyText}>No active caregivers found</Text>
            ) : (
              <View style={styles.listColumn}>
                {sortedCaregivers.map(cg => {
                  const isSelected = selectedCaregiverId === cg.id;
                  const capMatch = (cg.matchScore ?? 0) > 0;
                  return (
                    <Pressable
                      key={cg.id}
                      style={[styles.listRow, isSelected && styles.listRowSelected]}
                      onPress={() => {
                        setSelectedCaregiverId(cg.id);
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpandedSection('time');
                      }}
                    >
                      <View style={styles.listRowLeft}>
                        {isSelected && <CheckIcon size={16} color={colors.white} />}
                        <Text style={[styles.listRowName, isSelected && styles.listRowNameSelected]}>
                          {cg.first_name} {cg.last_name}
                        </Text>
                      </View>
                      <View style={styles.badgeRow}>
                        {cg.zipMatch && (
                          <View style={styles.zipBadge}><Text style={styles.zipBadgeText}>Nearby</Text></View>
                        )}
                        {showMatch && capMatch && (
                          <View style={styles.matchBadge}><Text style={styles.matchBadgeText}>Match</Text></View>
                        )}
                        {showMatch && !capMatch && (
                          <View style={styles.noMatchBadge}><Text style={styles.noMatchBadgeText}>No Match</Text></View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </SectionCard>

          {/* Time */}
          <SectionCard
            icon={<ClockIcon size={20} color={roleColors.agency_owner} />}
            title="Time"
            subtitle={startTime < endTime ? `${formatTimeDisplay(startTime)} – ${formatTimeDisplay(endTime)}` : undefined}
            expanded={expandedSection === 'time'}
            onToggle={() => toggleSection('time')}
          >
            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Start</Text>
                <ScrollView style={styles.timePicker} nestedScrollEnabled>
                  {TIME_OPTIONS.map(time => (
                    <Pressable
                      key={time}
                      style={[styles.timeOption, startTime === time && styles.timeOptionSelected]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text style={[styles.timeOptionText, startTime === time && styles.timeOptionTextSelected]}>
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
                  {TIME_OPTIONS.map(time => (
                    <Pressable
                      key={time}
                      style={[styles.timeOption, endTime === time && styles.timeOptionSelected]}
                      onPress={() => setEndTime(time)}
                    >
                      <Text style={[styles.timeOptionText, endTime === time && styles.timeOptionTextSelected]}>
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
          </SectionCard>

          {/* Submit */}
          <Button
            title="Create Assignment"
            variant="primary"
            size="lg"
            onPress={handleSubmitPress}
            loading={saving}
            fullWidth
          />
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Disclaimer Modal */}
        <Modal
          visible={showDisclaimerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDisclaimerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Liability Disclaimer</Text>
              <Text style={styles.modalText}>
                You have selected tasks that involve personal care, medication,
                nutrition, or vital signs monitoring. These tasks may require
                appropriate medical qualifications or certifications.
              </Text>
              <Text style={styles.modalText}>
                HealthGuide does not verify caregiver licenses, certifications,
                or medical qualifications. By proceeding, the elder and their
                family assume full responsibility for ensuring the assigned
                caregiver is qualified to perform these tasks.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancelButton} onPress={() => setShowDisclaimerModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalAcceptButton} onPress={handleDisclaimerAccept}>
                  <Text style={styles.modalAcceptText}>I Understand & Accept</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing[4], gap: spacing[3] },

  // Section card
  section: { padding: spacing[4] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionTitleRow: { flex: 1 },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginLeft: spacing[2],
  },
  sectionBody: { marginTop: spacing[3] },

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
  hintText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing[1],
  },

  // Elder picker
  elderPicker: {
    maxHeight: 200,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  elderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  elderOptionSelected: {
    backgroundColor: roleColors.agency_owner,
  },
  elderOptionText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  elderOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  elderOptionZip: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },

  // Autocomplete
  autocompleteContainer: { zIndex: 10 },
  searchInput: {
    ...typography.styles.body,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    color: colors.text.primary,
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    marginTop: spacing[1],
    overflow: 'hidden',
    maxHeight: 260,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  dropdownItemText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  dropdownItemHint: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
    marginLeft: spacing[2],
  },
  dropdownEmpty: {
    ...typography.styles.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  addNewItem: {
    backgroundColor: colors.primary[50],
  },
  addNewText: {
    ...typography.styles.body,
    color: colors.primary[600],
    fontWeight: '600',
  },

  // Selected chips
  selectedChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: roleColors.agency_owner,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.lg,
  },
  taskChipGreen: {
    backgroundColor: colors.success[500],
  },
  selectedChipText: {
    ...typography.styles.caption,
    color: colors.white,
    fontWeight: '600',
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnX: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },

  // Caregiver list
  listColumn: { gap: spacing[2] },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  listRowSelected: {
    backgroundColor: roleColors.agency_owner,
    borderColor: roleColors.agency_owner,
  },
  listRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  listRowName: { ...typography.styles.body, color: colors.text.primary },
  listRowNameSelected: { color: colors.white, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 4 },
  zipBadge: {
    backgroundColor: colors.info[100],
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  zipBadgeText: { fontSize: 10, fontWeight: '700', color: colors.info[700] },
  matchBadge: {
    backgroundColor: colors.success[100],
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  matchBadgeText: { fontSize: 10, fontWeight: '700', color: colors.success[700] },
  noMatchBadge: {
    backgroundColor: colors.warning[100],
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  noMatchBadgeText: { fontSize: 10, fontWeight: '700', color: colors.warning[700] },

  // Time
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  timeColumn: { flex: 1 },
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
  timeOptionSelected: { backgroundColor: roleColors.agency_owner },
  timeOptionText: {
    ...typography.styles.body,
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 14,
  },
  timeOptionTextSelected: { color: colors.white, fontWeight: '600' },
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

  // Liability banner
  liabilityBanner: {
    backgroundColor: colors.warning[50],
    borderWidth: 1,
    borderColor: colors.warning[300],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  liabilityTitle: {
    ...typography.styles.label,
    color: colors.warning[800],
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  liabilityText: {
    ...typography.styles.caption,
    color: colors.warning[700],
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.styles.h3,
    color: colors.warning[800],
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  modalText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  modalButtons: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: 'center',
  },
  modalCancelText: { ...typography.styles.body, color: colors.text.secondary, fontWeight: '600' },
  modalAcceptButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warning[600],
    alignItems: 'center',
  },
  modalAcceptText: { ...typography.styles.body, color: colors.white, fontWeight: '600' },
  bottomSpacer: { height: spacing[8] },
});
