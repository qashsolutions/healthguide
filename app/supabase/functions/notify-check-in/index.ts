// HealthGuide Check-In Notification Edge Function
// Sends push notifications to care group members when caregiver checks in.
// Notifies: family members and elders in the care group (not the caregiver themselves).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface CheckInEvent {
  visit_id: string;
  caregiver_id: string;
  elder_id: string;
  check_in_time: string;
}

serve(async (req) => {
  try {
    const event: CheckInEvent = await req.json();

    // Get visit details with caregiver and elder info
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select(`
        id,
        caregiver:user_profiles!caregiver_id (first_name),
        elder:elders!elder_id (first_name, last_name)
      `)
      .eq('id', event.visit_id)
      .single();

    if (visitError || !visit) {
      return new Response(
        JSON.stringify({ success: false, error: 'Visit not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get care group members who have accepted invitations and want check-in notifications.
    // Query care_group_members via the care_groups table (linked by elder_id).
    // Exclude the caregiver who is checking in (they don't need a notification about their own action).
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
      .neq('user_id', event.caregiver_id);

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

      // Use legacy path
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

async function sendNotifications(members: any[], visit: any, event: CheckInEvent) {
  // Filter for those who want check-in notifications
  const toNotify = members.filter(
    (m) => m.notification_preferences?.check_in !== false
  );

  if (toNotify.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: 'No members opted in for check-in alerts' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const checkInTime = format(new Date(event.check_in_time), 'h:mm a');
  const elderName = visit.elder.first_name;
  const caregiverName = visit.caregiver.first_name;

  // Send push notification to each member
  const results = [];
  for (const member of toNotify) {
    // Determine the correct screen based on member role
    const screen = member.role === 'elder' ? 'ElderVisitDetail' : 'FamilyVisitDetail';

    const response = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: member.user_id,
        title: `${caregiverName} has arrived`,
        body: `Care visit with ${elderName} started at ${checkInTime}`,
        data: {
          type: 'check_in',
          visit_id: event.visit_id,
          elder_id: event.elder_id,
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
