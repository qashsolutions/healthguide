// HealthGuide — Recurring Visit Logic
// Parse recurrence rules, generate child visits, cancel series

import { supabase } from '@/lib/supabase';

export interface RecurrenceConfig {
  frequency: 'weekly' | 'biweekly';
  days: string[]; // e.g. ['tuesday', 'thursday']
  endType: 'none' | 'after_count' | 'end_date';
  endAfterCount?: number;
  endDate?: string; // YYYY-MM-DD
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Build a recurrence_rule string from config.
 * Format: "weekly:tuesday,thursday" or "biweekly:monday"
 */
export function buildRecurrenceRule(config: RecurrenceConfig): string {
  return `${config.frequency}:${config.days.join(',')}`;
}

/**
 * Parse a recurrence_rule string back into frequency + days.
 */
export function parseRecurrenceRule(rule: string): { frequency: string; days: string[] } {
  const [frequency, daysStr] = rule.split(':');
  return { frequency, days: daysStr ? daysStr.split(',') : [] };
}

/**
 * Get the day name (lowercase) for a Date.
 */
function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

/**
 * Replace the date portion of a timestamp while keeping the time.
 */
function replaceDate(timestamp: string, newDate: string): string {
  const timePart = timestamp.includes('T')
    ? timestamp.split('T')[1]
    : timestamp;
  return `${newDate}T${timePart}`;
}

/**
 * Generate child visits for a recurring parent visit.
 * Creates visits for a rolling 4-week window from today.
 * Returns the count of visits created.
 */
export async function generateChildVisits(
  parentVisitId: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // 1. Fetch parent visit
    const { data: parent, error: parentError } = await supabase
      .from('visits')
      .select('id, elder_id, caregiver_id, agency_id, scheduled_start, scheduled_end, notes, recurrence_rule, is_recurring')
      .eq('id', parentVisitId)
      .single();

    if (parentError || !parent) {
      return { success: false, count: 0, error: 'Parent visit not found' };
    }

    if (!parent.is_recurring || !parent.recurrence_rule) {
      return { success: false, count: 0, error: 'Visit is not recurring' };
    }

    const { frequency, days } = parseRecurrenceRule(parent.recurrence_rule);

    // 2. Find existing child visits to avoid duplicates
    const { data: existingChildren } = await supabase
      .from('visits')
      .select('scheduled_date')
      .eq('parent_visit_id', parentVisitId);

    const existingDates = new Set((existingChildren || []).map((c) => c.scheduled_date));

    // Also exclude the parent's own date
    const parentDate = parent.scheduled_start?.split('T')[0];
    if (parentDate) existingDates.add(parentDate);

    // 3. Get parent's tasks for cloning
    const { data: parentTasks } = await supabase
      .from('visit_tasks')
      .select('task_id')
      .eq('visit_id', parentVisitId);

    // 4. Generate next 4 weeks of visits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourWeeksOut = new Date(today.getTime() + 28 * 86400000);

    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    let createdCount = 0;
    let weekNumber = 0;
    let lastWeek = -1;

    while (currentDate <= fourWeeksOut) {
      const currentWeek = Math.floor((currentDate.getTime() - today.getTime()) / (7 * 86400000));
      if (currentWeek !== lastWeek) {
        weekNumber++;
        lastWeek = currentWeek;
      }

      // For biweekly, skip odd weeks
      if (frequency === 'biweekly' && weekNumber % 2 === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const dayName = getDayName(currentDate);
      if (days.includes(dayName)) {
        const dateStr = currentDate.toISOString().split('T')[0];

        if (!existingDates.has(dateStr)) {
          // Create child visit
          const { data: newVisit } = await supabase
            .from('visits')
            .insert({
              elder_id: parent.elder_id,
              caregiver_id: parent.caregiver_id,
              agency_id: parent.agency_id,
              scheduled_date: dateStr,
              scheduled_start: replaceDate(parent.scheduled_start, dateStr),
              scheduled_end: replaceDate(parent.scheduled_end, dateStr),
              status: 'scheduled',
              notes: parent.notes,
              is_recurring: false,
              parent_visit_id: parentVisitId,
            })
            .select('id')
            .single();

          // Clone tasks
          if (newVisit && parentTasks && parentTasks.length > 0) {
            const taskInserts = parentTasks.map((t) => ({
              visit_id: newVisit.id,
              task_id: t.task_id,
              status: 'pending' as const,
            }));
            await supabase.from('visit_tasks').insert(taskInserts);
          }

          createdCount++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { success: true, count: createdCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Failed to generate visits' };
  }
}

/**
 * Cancel all future child visits in a recurring series.
 * Also marks the parent as no longer recurring.
 */
export async function cancelRecurringSeries(
  parentVisitId: string,
): Promise<{ success: boolean; cancelled: number; error?: string }> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Cancel all future scheduled child visits
    const { data, error: cancelError } = await supabase
      .from('visits')
      .update({ status: 'cancelled' })
      .eq('parent_visit_id', parentVisitId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', todayStr)
      .select('id');

    if (cancelError) throw cancelError;

    // Mark parent as no longer recurring
    await supabase
      .from('visits')
      .update({ is_recurring: false })
      .eq('id', parentVisitId);

    return { success: true, cancelled: data?.length || 0 };
  } catch (err: any) {
    return { success: false, cancelled: 0, error: err.message || 'Failed to cancel series' };
  }
}

/**
 * Get the day name from a date string (YYYY-MM-DD).
 */
export function getDayFromDateString(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[date.getDay()];
}
