// HealthGuide — Schedule Reminders Edge Function
// Run on a cron (every 15 min) to send 24h and 1h visit reminders
// Uses visits.reminder_24h_sent and reminder_1h_sent flags

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SEND_NOTIFICATION_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sendNotification(payload: Record<string, any>) {
  await fetch(SEND_NOTIFICATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
}

serve(async (_req) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

    let sent24h = 0;
    let sent1h = 0;

    // --- 24-hour reminders ---
    // Visits scheduled for tomorrow that haven't had 24h reminder
    const { data: visits24h } = await supabase
      .from('visits')
      .select('id, caregiver_id, elder_id, scheduled_start, elders(first_name, last_name, user_id), user_profiles!visits_caregiver_id_fkey(first_name)')
      .eq('status', 'scheduled')
      .eq('scheduled_date', tomorrowStr)
      .eq('reminder_24h_sent', false);

    for (const visit of visits24h || []) {
      const elder = Array.isArray(visit.elders) ? visit.elders[0] : visit.elders;
      const caregiver = Array.isArray(visit.user_profiles) ? visit.user_profiles[0] : visit.user_profiles;
      const elderName = elder ? `${elder.first_name} ${elder.last_name}` : 'your client';
      const caregiverName = caregiver?.first_name || 'Your companion';

      const time = formatTime(visit.scheduled_start);

      // Notify companion
      await sendNotification({
        userId: visit.caregiver_id,
        title: 'Visit Tomorrow',
        body: `Visit with ${elderName} tomorrow at ${time}`,
        type: 'shift_reminder',
        data: { type: 'shift_reminder', visitId: visit.id },
      });

      // Notify elder
      if (elder?.user_id) {
        await sendNotification({
          userId: elder.user_id,
          title: 'Visit Tomorrow',
          body: `${caregiverName} is visiting tomorrow at ${time}`,
          type: 'shift_reminder',
          data: { type: 'shift_reminder', visitId: visit.id },
        });
      }

      // Mark as sent
      await supabase
        .from('visits')
        .update({ reminder_24h_sent: true })
        .eq('id', visit.id);

      sent24h++;
    }

    // --- 1-hour reminders ---
    // Visits today within 45-75 minutes from now that haven't had 1h reminder
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const windowStart = nowMinutes + 45; // 45 min from now
    const windowEnd = nowMinutes + 75; // 75 min from now

    const { data: visitsToday } = await supabase
      .from('visits')
      .select('id, caregiver_id, elder_id, scheduled_start, elders(first_name, last_name, user_id), user_profiles!visits_caregiver_id_fkey(first_name)')
      .eq('status', 'scheduled')
      .eq('scheduled_date', todayStr)
      .eq('reminder_1h_sent', false);

    for (const visit of visitsToday || []) {
      // Parse scheduled_start time
      const startTime = visit.scheduled_start;
      let visitMinutes: number;

      if (startTime.includes('T')) {
        const d = new Date(startTime);
        visitMinutes = d.getHours() * 60 + d.getMinutes();
      } else {
        const [h, m] = startTime.split(':').map(Number);
        visitMinutes = h * 60 + m;
      }

      if (visitMinutes >= windowStart && visitMinutes <= windowEnd) {
        const elder = Array.isArray(visit.elders) ? visit.elders[0] : visit.elders;
        const caregiver = Array.isArray(visit.user_profiles) ? visit.user_profiles[0] : visit.user_profiles;
        const elderName = elder ? `${elder.first_name} ${elder.last_name}` : 'your client';
        const caregiverName = caregiver?.first_name || 'Your companion';

        const time = formatTime(visit.scheduled_start);

        // Notify companion
        await sendNotification({
          userId: visit.caregiver_id,
          title: 'Visit in 1 Hour',
          body: `Visit with ${elderName} starts at ${time}`,
          type: 'shift_reminder',
          data: { type: 'shift_reminder', visitId: visit.id },
          urgent: true,
        });

        // Notify elder
        if (elder?.user_id) {
          await sendNotification({
            userId: elder.user_id,
            title: 'Visit in 1 Hour',
            body: `${caregiverName} is arriving at ${time}`,
            type: 'shift_reminder',
            data: { type: 'shift_reminder', visitId: visit.id },
            urgent: true,
          });
        }

        // Mark as sent
        await supabase
          .from('visits')
          .update({ reminder_1h_sent: true })
          .eq('id', visit.id);

        sent1h++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent_24h: sent24h, sent_1h: sent1h }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

function formatTime(time: string): string {
  let hours: number;
  let minutes: number;

  if (time.includes('T')) {
    const d = new Date(time);
    hours = d.getHours();
    minutes = d.getMinutes();
  } else {
    [hours, minutes] = time.split(':').map(Number);
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}
