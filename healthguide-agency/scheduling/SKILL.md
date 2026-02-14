---
name: healthguide-agency-scheduling
description: Scheduling and caregiver assignment for HealthGuide agencies. Publish available time slots, set minimum booking duration, assign caregivers to careseekers, and manage recurring schedules. Use when building calendar views, slot publishing, or assignment workflows.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [scheduling, calendar, assignments, recurring]
---

# HealthGuide Scheduling

## Overview
Agency owners manage care schedules by publishing available slots and assigning caregivers to careseekers. Supports one-time and recurring assignments with flexible modification.

## Key Features

- Publish available time slots
- Set minimum booking duration
- Assign caregivers to careseekers
- Recurring weekly patterns
- Per-instance modifications
- Caregiver preference tracking

## Data Model

```typescript
// types/scheduling.ts
export interface TimeSlot {
  id: string;
  agency_id: string;

  // Slot details
  date: string;            // ISO date "2024-01-15"
  start_time: string;      // "09:00"
  end_time: string;        // "12:00"

  // Assignment
  caregiver_id?: string;
  careseeker_id?: string;
  status: SlotStatus;

  // Recurrence
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  parent_slot_id?: string; // For recurring instances

  // Metadata
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type SlotStatus =
  | 'available'      // Published, not assigned
  | 'assigned'       // Caregiver assigned to careseeker
  | 'in_progress'    // Visit started
  | 'completed'      // Visit completed
  | 'cancelled';     // Cancelled

export interface RecurrencePattern {
  frequency: 'weekly';
  days_of_week: number[];  // 0=Sunday, 1=Monday, etc.
  end_date?: string;       // When recurrence ends
}

export interface Visit {
  id: string;
  slot_id: string;
  agency_id: string;
  caregiver_id: string;
  careseeker_id: string;

  // Time tracking (EVV)
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;

  // Location (EVV)
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;

  // Tasks
  tasks: VisitTask[];

  // Status
  status: VisitStatus;
  created_at: string;
}

export type VisitStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'checked_out'
  | 'completed'
  | 'missed'
  | 'cancelled';

export interface AgencySettings {
  agency_id: string;
  minimum_booking_minutes: number; // e.g., 60 = 1 hour minimum
  default_slot_duration_minutes: number;
  advance_booking_days: number;    // How far ahead to schedule
  allow_same_day_booking: boolean;
}
```

## Instructions

### Step 1: Calendar View Screen

```typescript
// app/(protected)/agency/(tabs)/scheduling.tsx
import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TimeSlot } from '@/types/scheduling';
import { WeekCalendar } from '@/components/scheduling/WeekCalendar';
import { DaySchedule } from '@/components/scheduling/DaySchedule';
import { Button } from '@/components/ui/Button';
import { format, startOfWeek, addDays } from 'date-fns';

export default function SchedulingScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  async function fetchSlots() {
    setLoading(true);
    const { data } = await supabase
      .from('time_slots')
      .select(`
        *,
        caregiver:caregivers(full_name, avatar_url),
        careseeker:careseekers(full_name, preferred_name)
      `)
      .eq('agency_id', user!.agency_id)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .order('date')
      .order('start_time');

    if (data) setSlots(data);
    setLoading(false);
  }

  const selectedDaySlots = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return slots.filter((s) => s.date === dateStr);
  }, [slots, selectedDate]);

  return (
    <View style={styles.container}>
      <WeekCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        slots={slots}
      />

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        <Button
          title="+ Add Slot"
          size="small"
          onPress={() => {/* Open slot creator */}}
        />
      </View>

      <ScrollView style={styles.schedule}>
        <DaySchedule
          slots={selectedDaySlots}
          onSlotPress={(slot) => {/* Open slot detail */}}
          onAssign={(slot) => {/* Open assignment modal */}}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  schedule: {
    flex: 1,
  },
});
```

### Step 2: Week Calendar Component

```typescript
// components/scheduling/WeekCalendar.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { TimeSlot } from '@/types/scheduling';

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  slots: TimeSlot[];
}

export function WeekCalendar({ selectedDate, onSelectDate, slots }: Props) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getSlotCountForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter((s) => s.date === dateStr).length;
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekNav}>
        <Pressable onPress={() => onSelectDate(addDays(selectedDate, -7))}>
          <Text style={styles.navButton}>← Prev</Text>
        </Pressable>
        <Text style={styles.weekLabel}>
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </Text>
        <Pressable onPress={() => onSelectDate(addDays(selectedDate, 7))}>
          <Text style={styles.navButton}>Next →</Text>
        </Pressable>
      </View>

      <View style={styles.days}>
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const slotCount = getSlotCountForDay(day);

          return (
            <Pressable
              key={day.toISOString()}
              style={[
                styles.day,
                isSelected && styles.daySelected,
                isToday && styles.dayToday,
              ]}
              onPress={() => onSelectDate(day)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {format(day, 'EEE')}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                {format(day, 'd')}
              </Text>
              {slotCount > 0 && (
                <View style={styles.slotIndicator}>
                  <Text style={styles.slotCount}>{slotCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  navButton: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  day: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 44,
  },
  daySelected: {
    backgroundColor: '#3B82F6',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
  },
  dayNameSelected: {
    color: '#FFFFFF',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  slotIndicator: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  slotCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
```

### Step 3: Create/Edit Slot Modal

```typescript
// components/scheduling/SlotForm.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TimeSlot, RecurrencePattern } from '@/types/scheduling';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TimePicker } from '@/components/ui/TimePicker';
import { DaySelector } from '@/components/ui/DaySelector';
import { format } from 'date-fns';

interface Props {
  visible: boolean;
  onClose: () => void;
  date: Date;
  onSave: () => void;
}

export function SlotForm({ visible, onClose, date, onSave }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    start_time: '09:00',
    end_time: '12:00',
    is_recurring: false,
    recurrence_days: [] as number[],
  });

  async function handleCreate() {
    // Validate minimum duration
    const settings = await getAgencySettings(user!.agency_id);
    const durationMinutes = calculateDuration(form.start_time, form.end_time);

    if (durationMinutes < settings.minimum_booking_minutes) {
      Alert.alert(
        'Duration Too Short',
        `Minimum booking is ${settings.minimum_booking_minutes} minutes.`
      );
      return;
    }

    setLoading(true);
    try {
      if (form.is_recurring) {
        // Create recurring slots
        await createRecurringSlots({
          agency_id: user!.agency_id,
          start_date: format(date, 'yyyy-MM-dd'),
          start_time: form.start_time,
          end_time: form.end_time,
          days_of_week: form.recurrence_days,
        });
      } else {
        // Create single slot
        await supabase.from('time_slots').insert({
          agency_id: user!.agency_id,
          date: format(date, 'yyyy-MM-dd'),
          start_time: form.start_time,
          end_time: form.end_time,
          status: 'available',
          is_recurring: false,
        });
      }

      onSave();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Could not create slot');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Create Time Slot</Text>
        <Text style={styles.date}>{format(date, 'EEEE, MMMM d, yyyy')}</Text>

        <View style={styles.timeRow}>
          <TimePicker
            label="Start Time"
            value={form.start_time}
            onChange={(time) => setForm({ ...form, start_time: time })}
          />
          <Text style={styles.timeDivider}>to</Text>
          <TimePicker
            label="End Time"
            value={form.end_time}
            onChange={(time) => setForm({ ...form, end_time: time })}
          />
        </View>

        <View style={styles.recurringSection}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Recurring Weekly</Text>
            <Switch
              value={form.is_recurring}
              onValueChange={(value) =>
                setForm({ ...form, is_recurring: value })
              }
            />
          </View>

          {form.is_recurring && (
            <DaySelector
              selected={form.recurrence_days}
              onChange={(days) => setForm({ ...form, recurrence_days: days })}
            />
          )}
        </View>

        <View style={styles.actions}>
          <Button title="Cancel" variant="outline" onPress={onClose} />
          <Button
            title="Create Slot"
            onPress={handleCreate}
            loading={loading}
          />
        </View>
      </View>
    </Modal>
  );
}

async function createRecurringSlots(params: {
  agency_id: string;
  start_date: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}) {
  // Create slots for next 12 weeks
  const { data, error } = await supabase.functions.invoke('create-recurring-slots', {
    body: params,
  });
  if (error) throw error;
  return data;
}

function calculateDuration(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  timeDivider: {
    fontSize: 16,
    color: '#6B7280',
  },
  recurringSection: {
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
});
```

### Step 4: Assignment Modal

```typescript
// components/scheduling/AssignmentModal.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TimeSlot } from '@/types/scheduling';
import { Caregiver } from '@/types/caregiver';
import { Careseeker } from '@/types/careseeker';
import { Button } from '@/components/ui/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
  slot: TimeSlot;
  onAssign: () => void;
}

export function AssignmentModal({ visible, onClose, slot, onAssign }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'caregiver' | 'careseeker'>('careseeker');
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [careseekers, setCareseekers] = useState<Careseeker[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string | null>(null);
  const [selectedCareseeker, setSelectedCareseeker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCaregivers();
      fetchCareseekers();
    }
  }, [visible]);

  async function fetchCaregivers() {
    // Fetch available caregivers for this time slot
    const { data } = await supabase
      .from('caregivers')
      .select('*')
      .eq('agency_id', user!.agency_id)
      .eq('status', 'active');

    // Filter by availability
    if (data) {
      const dayOfWeek = new Date(slot.date).getDay();
      const available = data.filter((cg) => {
        const daySlots = cg.availability?.[getDayName(dayOfWeek)] || [];
        return daySlots.some((ds: any) =>
          ds.start <= slot.start_time && ds.end >= slot.end_time
        );
      });
      setCaregivers(available);
    }
  }

  async function fetchCareseekers() {
    const { data } = await supabase
      .from('careseekers')
      .select('*')
      .eq('agency_id', user!.agency_id)
      .eq('status', 'active');

    if (data) setCareseekers(data);
  }

  async function handleAssign() {
    if (!selectedCaregiver || !selectedCareseeker) return;

    setLoading(true);
    try {
      // Update slot with assignment
      await supabase
        .from('time_slots')
        .update({
          caregiver_id: selectedCaregiver,
          careseeker_id: selectedCareseeker,
          status: 'assigned',
        })
        .eq('id', slot.id);

      // Create visit record
      await supabase.from('visits').insert({
        slot_id: slot.id,
        agency_id: user!.agency_id,
        caregiver_id: selectedCaregiver,
        careseeker_id: selectedCareseeker,
        scheduled_start: `${slot.date}T${slot.start_time}`,
        scheduled_end: `${slot.date}T${slot.end_time}`,
        status: 'scheduled',
      });

      onAssign();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Could not create assignment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Assign Visit</Text>

        {step === 'careseeker' ? (
          <>
            <Text style={styles.subtitle}>Select Elder</Text>
            <FlatList
              data={careseekers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.listItem,
                    selectedCareseeker === item.id && styles.listItemSelected,
                  ]}
                  onPress={() => setSelectedCareseeker(item.id)}
                >
                  <Text style={styles.listItemName}>{item.full_name}</Text>
                  {item.preferred_caregiver_id && (
                    <Text style={styles.preference}>Has caregiver preference</Text>
                  )}
                </Pressable>
              )}
            />
            <Button
              title="Next: Select Caregiver"
              onPress={() => setStep('caregiver')}
              disabled={!selectedCareseeker}
            />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Select Caregiver</Text>
            <FlatList
              data={caregivers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.listItem,
                    selectedCaregiver === item.id && styles.listItemSelected,
                  ]}
                  onPress={() => setSelectedCaregiver(item.id)}
                >
                  <Text style={styles.listItemName}>{item.full_name}</Text>
                  <Text style={styles.listItemDetail}>
                    {item.is_licensed ? 'Licensed' : 'Unlicensed'}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No available caregivers</Text>
              }
            />
            <View style={styles.actions}>
              <Button title="Back" variant="outline" onPress={() => setStep('careseeker')} />
              <Button
                title="Assign"
                onPress={handleAssign}
                loading={loading}
                disabled={!selectedCaregiver}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function getDayName(day: number): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  listItem: {
    padding: 16,
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  listItemSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItemDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  preference: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
```

## Troubleshooting

### Recurring slots not generating
**Cause:** Edge function timeout or date calculation error
**Solution:** Limit recurrence to 12-16 weeks, verify timezone handling

### Caregiver availability not matching
**Cause:** Availability stored in different timezone
**Solution:** Store all times in UTC, convert on display
