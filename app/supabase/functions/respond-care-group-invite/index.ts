// HealthGuide Respond Care Group Invite Edge Function
// Handles caregiver accepting or declining a care group invitation.
// Updates consent status and creates caregiver-agency links on acceptance.
// Sends push notifications to agency owner.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RespondInviteRequest {
  member_id: string;
  response: 'accepted' | 'declined';
  user_id: string;
}

serve(async (req) => {
  try {
    const payload: RespondInviteRequest = await req.json();

    // Validate request fields
    if (!payload.member_id || !payload.response || !payload.user_id) {
      return jsonResponse(
        { success: false, error: 'member_id, response, and user_id are required' },
        400
      );
    }

    if (!['accepted', 'declined'].includes(payload.response)) {
      return jsonResponse(
        { success: false, error: 'response must be "accepted" or "declined"' },
        400
      );
    }

    // Fetch the care group member record
    const { data: member, error: memberError } = await supabase
      .from('care_group_members')
      .select('*')
      .eq('id', payload.member_id)
      .single();

    if (memberError || !member) {
      return jsonResponse({ success: false, error: 'Care group member not found' }, 404);
    }

    // Verify member is a caregiver with pending consent
    if (member.role !== 'caregiver') {
      return jsonResponse({ success: false, error: 'Member is not a caregiver' }, 400);
    }

    if (member.consent_status !== 'pending') {
      return jsonResponse(
        { success: false, error: 'Invitation is no longer pending' },
        409
      );
    }

    // Update care group member with response
    const updateData: Record<string, unknown> = {
      consent_status: payload.response,
      consent_given_at: new Date().toISOString(),
    };

    if (payload.response === 'accepted') {
      updateData.invite_status = 'accepted';
      updateData.accepted_at = new Date().toISOString();
      updateData.user_id = payload.user_id;
    }

    const { error: updateError } = await supabase
      .from('care_group_members')
      .update(updateData)
      .eq('id', payload.member_id);

    if (updateError) {
      console.error('Member update error:', updateError);
      return jsonResponse({ success: false, error: updateError.message }, 400);
    }

    // Get care group details
    const { data: careGroup, error: careGroupError } = await supabase
      .from('care_groups')
      .select('id, agency_id, name, created_by')
      .eq('id', member.care_group_id)
      .single();

    if (careGroupError || !careGroup) {
      console.error('Care group not found:', careGroupError);
      return jsonResponse({ success: false, error: 'Care group not found' }, 404);
    }

    // If accepted, create caregiver-agency link
    if (payload.response === 'accepted') {
      // Get caregiver profile
      const { data: caregiverProfile, error: profileError } = await supabase
        .from('caregiver_profiles')
        .select('id')
        .eq('user_id', payload.user_id)
        .single();

      if (!profileError && caregiverProfile) {
        // Insert caregiver-agency link (ignore if already exists)
        await supabase
          .from('caregiver_agency_links')
          .upsert(
            {
              caregiver_profile_id: caregiverProfile.id,
              agency_id: careGroup.agency_id,
            },
            { onConflict: 'caregiver_profile_id,agency_id' }
          );

        // Update member with caregiver_profile_id
        await supabase
          .from('care_group_members')
          .update({ caregiver_profile_id: caregiverProfile.id })
          .eq('id', payload.member_id);
      }

      // Send push notification to agency owner
      try {
        await sendPushNotification(
          careGroup.created_by,
          'Caregiver Accepted',
          `${member.name} accepted the invitation to ${careGroup.name}`
        );
      } catch (notificationError) {
        console.error('Failed to send push notification:', notificationError);
        // Don't fail the request if notification fails
      }
    } else if (payload.response === 'declined') {
      // Send push notification to agency owner about decline
      try {
        await sendPushNotification(
          careGroup.created_by,
          'Caregiver Declined',
          `${member.name} declined the invitation to ${careGroup.name}`
        );
      } catch (notificationError) {
        console.error('Failed to send push notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return jsonResponse({
      success: true,
      consent_status: payload.response,
      care_group_id: careGroup.id,
      member_id: payload.member_id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});

/**
 * Sends a push notification to a user via the send-push-notification edge function.
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  // Get device tokens for the user
  const { data: deviceTokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (tokenError || !deviceTokens || deviceTokens.length === 0) {
    console.warn(`No active device tokens found for user ${userId}`);
    return;
  }

  // Call send-push-notification edge function for each device
  const baseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  for (const deviceToken of deviceTokens) {
    try {
      const response = await fetch(
        `${baseUrl}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            device_token: deviceToken.token,
            title,
            body,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to send push notification: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
