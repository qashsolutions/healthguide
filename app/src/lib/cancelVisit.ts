// HealthGuide — Visit Cancellation Logic
// Shared between companion and elder cancellation flows
// Handles time-based penalties and auto-ratings

import { supabase } from '@/lib/supabase';

interface CancelResult {
  success: boolean;
  isLate: boolean;
  error?: string;
}

/**
 * Cancel a visit. Handles:
 * - Normal cancellation (>= 30 min before) → status='cancelled'
 * - Late companion cancellation (< 30 min before) → status='cancelled_late' + auto 1-star
 * - Elder cancellation → always status='cancelled', no penalty
 */
export async function cancelVisit(
  visitId: string,
  cancelledBy: 'companion' | 'elder',
  userId: string,
): Promise<CancelResult> {
  try {
    const { data: visit, error: fetchError } = await supabase
      .from('visits')
      .select('scheduled_start, caregiver_id, elder_id, agency_id')
      .eq('id', visitId)
      .single();

    if (fetchError || !visit) {
      return { success: false, isLate: false, error: 'Visit not found' };
    }

    const visitStart = new Date(visit.scheduled_start);
    const now = new Date();
    const minutesBefore = (visitStart.getTime() - now.getTime()) / 60000;

    if (cancelledBy === 'companion') {
      if (minutesBefore < 30) {
        // Late cancellation — auto 1-star rating
        await supabase
          .from('visits')
          .update({ status: 'cancelled_late' })
          .eq('id', visitId);

        // Get elder's user_id for the auto-rating
        const { data: elder } = await supabase
          .from('elders')
          .select('user_id')
          .eq('id', visit.elder_id)
          .single();

        if (elder?.user_id) {
          await supabase.from('visit_ratings').insert({
            visit_id: visitId,
            rated_by: elder.user_id,
            rated_user: visit.caregiver_id,
            rating: 1,
            reason: 'Cancelled less than 30 minutes before scheduled visit.',
            is_auto_generated: true,
          });
        }

        // Notify elder (non-blocking)
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              elderId: visit.elder_id,
              title: 'Visit Cancelled',
              body: 'Your companion cancelled with short notice.',
              data: { type: 'visit_cancelled_late', visitId },
            },
          });
        } catch {}

        return { success: true, isLate: true };
      } else {
        // Normal cancellation — no penalty
        await supabase
          .from('visits')
          .update({ status: 'cancelled' })
          .eq('id', visitId);

        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              elderId: visit.elder_id,
              title: 'Visit Cancelled',
              body: 'Your companion cancelled the upcoming visit.',
              data: { type: 'visit_cancelled', visitId },
            },
          });
        } catch {}

        return { success: true, isLate: false };
      }
    }

    if (cancelledBy === 'elder') {
      // Elder cancels — no penalty, notify companion
      await supabase
        .from('visits')
        .update({ status: 'cancelled' })
        .eq('id', visitId);

      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: visit.caregiver_id,
            title: 'Visit Cancelled',
            body: 'The elder cancelled the upcoming visit.',
            data: { type: 'visit_cancelled', visitId },
          },
        });
      } catch {}

      return { success: true, isLate: false };
    }

    return { success: false, isLate: false, error: 'Invalid canceller' };
  } catch (err: any) {
    return { success: false, isLate: false, error: err.message || 'Cancellation failed' };
  }
}

/**
 * Mark a visit as elder unavailable.
 * Companion arrived but elder wasn't home. No penalty.
 */
export async function markElderUnavailable(
  visitId: string,
  note: string,
  coords?: { latitude: number; longitude: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase
      .from('visits')
      .update({
        status: 'elder_unavailable',
        notes: note,
        actual_start: new Date().toISOString(),
        ...(coords ? {
          check_in_latitude: coords.latitude,
          check_in_longitude: coords.longitude,
        } : {}),
      })
      .eq('id', visitId);

    // Get elder_id for notification
    const { data: visit } = await supabase
      .from('visits')
      .select('elder_id')
      .eq('id', visitId)
      .single();

    if (visit?.elder_id) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            elderId: visit.elder_id,
            title: 'Companion Arrived',
            body: 'Your companion arrived but you were not available.',
            data: { type: 'elder_unavailable', visitId },
          },
        });
      } catch {}
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update visit' };
  }
}

/**
 * Check if a cancellation would be "late" (< 30 min before start).
 */
export function isLateCancellation(scheduledStart: string): boolean {
  const visitStart = new Date(scheduledStart);
  const now = new Date();
  const minutesBefore = (visitStart.getTime() - now.getTime()) / 60000;
  return minutesBefore < 30;
}
