// HealthGuide Create Care Group Edge Function
// Agency owner creates a care group for an elder and adds members.
// Returns invite code + deep link for sharing via native share sheet / QR code.
// No Twilio dependency — invites are delivered client-side.
// Updated: Caregiver consent flow - caregivers must accept before joining.
// Links caregiver_profiles if phone matches. Sends push notification for consent.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const APP_SCHEME = 'healthguide';
const APP_DOWNLOAD_URL =
  Deno.env.get('APP_DOWNLOAD_URL') || 'https://healthguide.app/download';

interface GroupMemberInput {
  name: string;
  phone: string;
  role: 'caregiver' | 'family_member' | 'elder';
  relationship?: string; // For family members only
}

interface CreateGroupRequest {
  elder_id: string;
  created_by: string; // agency owner user_id
  members: GroupMemberInput[];
}

serve(async (req) => {
  try {
    const payload: CreateGroupRequest = await req.json();

    // Validate elder exists and get info
    const { data: elder, error: elderError } = await supabase
      .from('elders')
      .select(`
        id,
        first_name,
        last_name,
        agency_id,
        agency:agencies (name)
      `)
      .eq('id', payload.elder_id)
      .single();

    if (elderError || !elder) {
      return jsonResponse({ success: false, error: 'Elder not found' }, 404);
    }

    // Check if a care group already exists for this elder
    const { data: existingGroup } = await supabase
      .from('care_groups')
      .select('id')
      .eq('elder_id', payload.elder_id)
      .eq('is_active', true)
      .single();

    if (existingGroup) {
      return jsonResponse(
        { success: false, error: 'A care group already exists for this elder' },
        409
      );
    }

    // Validate member counts
    const familyCount = payload.members.filter((m) => m.role === 'family_member').length;
    const caregiverCount = payload.members.filter((m) => m.role === 'caregiver').length;
    const elderCount = payload.members.filter((m) => m.role === 'elder').length;

    if (familyCount > 3) {
      return jsonResponse({ success: false, error: 'Maximum 3 family members allowed' }, 400);
    }
    if (caregiverCount > 1) {
      return jsonResponse({ success: false, error: 'Maximum 1 caregiver allowed' }, 400);
    }
    if (elderCount > 1) {
      return jsonResponse({ success: false, error: 'Maximum 1 elder allowed' }, 400);
    }

    // Generate invite code via SQL function
    const { data: codeResult } = await supabase.rpc('generate_invite_code');
    const inviteCode = codeResult || generateInviteCodeFallback();

    // Build deep link URL
    const deepLink = `${APP_SCHEME}://join/${inviteCode}`;
    const elderName = `${elder.first_name} ${elder.last_name}`;

    // Create care group
    const { data: careGroup, error: groupError } = await supabase
      .from('care_groups')
      .insert({
        agency_id: elder.agency_id,
        elder_id: payload.elder_id,
        name: `${elderName}'s Care Team`,
        created_by: payload.created_by,
        invite_code: inviteCode,
        invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        qr_code_data: deepLink,
      })
      .select()
      .single();

    if (groupError) {
      console.error('Group creation error:', groupError);
      return jsonResponse({ success: false, error: groupError.message }, 400);
    }

    // Create member records (all pending)
    let caregiverUserId: string | null = null;
    const memberRecords = [];

    for (const m of payload.members) {
      const record: Record<string, unknown> = {
        care_group_id: careGroup.id,
        role: m.role,
        name: m.name,
        phone: formatPhoneNumber(m.phone),
        relationship: m.relationship || null,
        invite_status: 'pending',
        invited_at: new Date().toISOString(),
      };

      // If caregiver, add consent fields and look up caregiver profile
      if (m.role === 'caregiver') {
        record.consent_status = 'pending';
        record.consent_requested_at = new Date().toISOString();

        // Look up caregiver profile by phone
        if (m.phone) {
          const formattedPhone = formatPhoneNumber(m.phone);
          const { data: caregiverProfile } = await supabase
            .from('caregiver_profiles')
            .select('id, user_id')
            .eq('phone', formattedPhone)
            .eq('is_active', true)
            .single();

          if (caregiverProfile) {
            record.caregiver_profile_id = caregiverProfile.id;
            record.user_id = caregiverProfile.user_id;
            caregiverUserId = caregiverProfile.user_id;
          }
        }
      }

      memberRecords.push(record);
    }

    const { data: members, error: membersError } = await supabase
      .from('care_group_members')
      .insert(memberRecords)
      .select();

    if (membersError) {
      console.error('Members creation error:', membersError);
      // Rollback: delete the care group
      await supabase.from('care_groups').delete().eq('id', careGroup.id);
      return jsonResponse({ success: false, error: membersError.message }, 400);
    }

    // Send push notification to caregiver for consent
    if (caregiverUserId) {
      const { data: deviceTokens } = await supabase
        .from('device_tokens')
        .select('expo_push_token')
        .eq('user_id', caregiverUserId)
        .eq('is_active', true);

      if (deviceTokens && deviceTokens.length > 0) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            tokens: deviceTokens.map((d: Record<string, unknown>) => d.expo_push_token),
            title: 'New Care Group Invitation',
            body: `You've been invited to care for ${elderName}`,
            data: { type: 'care_group_invitation', care_group_id: careGroup.id },
          },
        });
      }
    }

    // Build share message
    const agencyName = Array.isArray(elder.agency) ? elder.agency[0]?.name : elder.agency?.name;
    const shareMessage = buildShareMessage(elderName, agencyName || '', inviteCode, APP_DOWNLOAD_URL);

    return jsonResponse({
      success: true,
      care_group_id: careGroup.id,
      invite_code: inviteCode,
      deep_link: deepLink,
      share_message: shareMessage,
      app_download_url: APP_DOWNLOAD_URL,
      members_created: members?.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        phone: m.phone,
        invite_status: m.invite_status,
      })),
      expires_at: careGroup.invite_expires_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});

function buildShareMessage(
  elderName: string,
  agencyName: string,
  inviteCode: string,
  downloadUrl: string
): string {
  return (
    `You've been invited to join ${elderName}'s care team on HealthGuide` +
    (agencyName ? ` by ${agencyName}` : '') +
    `.\n\n` +
    `1. Download the app: ${downloadUrl}\n` +
    `2. Tap "I have an invite" and enter code: ${inviteCode}\n\n` +
    `This invitation expires in 7 days.`
  );
}

function generateInviteCodeFallback(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
