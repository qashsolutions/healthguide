// HealthGuide Check-Out Notification Edge Function
// Sends push notifications with visit summary to care group members.
// Notifies: family members and elders in the care group (not the caregiver themselves).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, differenceInMinutes } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface CheckOutEvent {
  visit_id: string;
  elder_id: string;
  check_in_time: string;
  check_out_time: string;
}

serve(async (req) => {
  try {
    const event: CheckOutEvent = await req.json();

    // Get visit details with tasks
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select(`
        id,
        caregiver_id,
        caregiver:user_profiles!caregiver_id (first_name),
        elder:elders!elder_id (first_name),
        visit_tasks (
          status,
          task:task_library (name)
        )
      `)
      .eq('id', event.visit_id)
      .single();

    if (visitError || !visit) {
      return new Response(
        JSON.stringify({ success: false, error: 'Visit not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get care group members who want check-out notifications.
    // Exclude the caregiver who performed the visit.
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
      .not('user_id', 'is', null)
      .neq('user_id', visit.caregiver_id);

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

      return await sendNotifications(familyMembers, visit, event);
    }

    if (!groupMembers || groupMembers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No care group members to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return await sendNotifications(groupMembers, visit, event);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNotifications(members: any[], visit: any, event: CheckOutEvent) {
  // Filter for those who want check-out notifications
  const toNotify = members.filter(
    (m) => m.notification_preferences?.check_out !== false
  );

  if (toNotify.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: 'No members opted in for check-out alerts' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Calculate visit metrics
  const duration = differenceInMinutes(
    new Date(event.check_out_time),
    new Date(event.check_in_time)
  );
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const completedTasks = visit.visit_tasks.filter(
    (t: any) => t.status === 'completed'
  );
  const totalTasks = visit.visit_tasks.length;
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks.length / totalTasks) * 100)
    : 100;

  const elderName = visit.elder.first_name;
  const caregiverName = visit.caregiver.first_name;

  // Build notification body
  let body = `Visit complete (${durationStr})`;
  body += ` \u2022 ${completedTasks.length}/${totalTasks} tasks (${completionRate}%)`;

  // Send push notification to each member
  const results = [];
  for (const member of toNotify) {
    const screen = member.role === 'elder' ? 'ElderVisitDetail' : 'FamilyVisitDetail';

    const response = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: member.user_id,
        title: `${caregiverName}'s visit ended`,
        body,
        data: {
          type: 'check_out',
          visit_id: event.visit_id,
          elder_id: event.elder_id,
          duration_minutes: duration,
          tasks_completed: completedTasks.length,
          tasks_total: totalTasks,
          screen,
        },
        categoryId: 'visit_update',
      },
    });

    results.push({
      member_name: member.name,
      role: member.role || 'family_member',
      success: response.data?.success,
    });
  }

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
