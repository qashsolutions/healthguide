// HealthGuide Daily Report Notification Edge Function
// Sends push notifications about daily care reports to care group members.
// Notifies: family members, elders, and caregivers in the care group.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface DailyReportEvent {
  report_id: string;
  elder_id: string;
  elder_name: string;
  report_date: string;
  summary: {
    visits_count: number;
    tasks_completed: number;
    tasks_total: number;
    observations_count: number;
    flagged_observations: number;
  };
}

serve(async (req) => {
  try {
    const event: DailyReportEvent = await req.json();

    // Get care group members who want daily reports
    const { data: groupMembers, error: memberError } = await supabase
      .from('care_group_members')
      .select(`
        user_id,
        name,
        role,
        notification_preferences,
        care_group:care_groups!inner (elder_id)
      `)
      .eq('care_group.elder_id', event.elder_id)
      .eq('invite_status', 'accepted')
      .eq('is_active', true)
      .not('user_id', 'is', null);

    if (memberError) {
      // Fallback: try legacy family_members table
      const { data: familyMembers, error: familyError } = await supabase
        .from('family_members')
        .select('user_id, name, notification_preferences')
        .eq('elder_id', event.elder_id)
        .eq('invite_status', 'accepted')
        .eq('is_active', true)
        .not('user_id', 'is', null);

      if (familyError || !familyMembers || familyMembers.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: 'No members to notify' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      return await sendNotifications(familyMembers, event);
    }

    if (!groupMembers || groupMembers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No care group members to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return await sendNotifications(groupMembers, event);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNotifications(members: any[], event: DailyReportEvent) {
  // Filter for those who want daily report notifications
  const toNotify = members.filter(
    (m) => m.notification_preferences?.daily_report !== false
  );

  if (toNotify.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: 'No members opted in for daily reports' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Format the notification
  const reportDateFormatted = format(parseISO(event.report_date), 'MMMM d');
  const elderFirstName = event.elder_name.split(' ')[0];

  // Build summary text
  let bodyText = '';
  if (event.summary.visits_count === 0) {
    bodyText = 'No visits recorded for this day.';
  } else {
    const completionRate = event.summary.tasks_total > 0
      ? Math.round((event.summary.tasks_completed / event.summary.tasks_total) * 100)
      : 0;
    bodyText = `${event.summary.visits_count} visit${event.summary.visits_count !== 1 ? 's' : ''}, ${completionRate}% tasks completed`;

    if (event.summary.flagged_observations > 0) {
      bodyText += ` \u2022 ${event.summary.flagged_observations} alert${event.summary.flagged_observations !== 1 ? 's' : ''} flagged`;
    }
  }

  // Determine notification priority based on flagged observations
  const hasAlerts = event.summary.flagged_observations > 0;

  // Send push notification to each member
  const results = [];
  for (const member of toNotify) {
    // Determine correct screen based on member role
    let screen = 'FamilyReportDetail';
    if (member.role === 'elder') screen = 'ElderReportDetail';
    else if (member.role === 'caregiver') screen = 'CaregiverReportDetail';

    const response = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: member.user_id,
        title: `${elderFirstName}'s Daily Report - ${reportDateFormatted}`,
        body: bodyText,
        data: {
          type: 'daily_report',
          report_id: event.report_id,
          elder_id: event.elder_id,
          report_date: event.report_date,
          has_alerts: hasAlerts,
          screen,
        },
        badge: hasAlerts ? 1 : 0,
        categoryId: 'daily_report',
      },
    });

    results.push({
      member_name: member.name,
      role: member.role || 'family_member',
      success: response.data?.success,
    });
  }

  // Update report as sent
  await supabase
    .from('daily_reports')
    .update({
      sent_to_contacts: true,
      sent_at: new Date().toISOString(),
    })
    .eq('id', event.report_id);

  const successCount = results.filter((r) => r.success).length;

  return new Response(
    JSON.stringify({
      success: successCount > 0,
      sent: successCount,
      total: toNotify.length,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
