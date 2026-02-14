// HealthGuide Join Care Group Edge Function
// Validates an invite code, matches the user to a pending member,
// and links them to the care group. Called after phone OTP verification.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface JoinGroupRequest {
  invite_code: string;
  user_id: string;
  phone: string; // Used to match the pending member record
}

interface ValidateCodeRequest {
  invite_code: string;
  phone?: string; // Optional: if provided, also returns matching member info
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'join';

    if (action === 'validate') {
      return await handleValidate(req);
    }
    return await handleJoin(req);
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});

// Validate invite code — called before OTP to show group info
async function handleValidate(req: Request): Promise<Response> {
  const payload: ValidateCodeRequest = await req.json();

  // Validate invite code
  const { data: groupData, error: groupError } = await supabase
    .from('care_groups')
    .select(`
      id,
      name,
      invite_code,
      invite_expires_at,
      elder:elders (
        first_name,
        last_name
      ),
      agency:agencies (
        name
      )
    `)
    .eq('invite_code', payload.invite_code.toUpperCase())
    .gt('invite_expires_at', new Date().toISOString())
    .eq('is_active', true)
    .single();

  if (groupError || !groupData) {
    return jsonResponse({
      valid: false,
      error: 'Invalid or expired invitation code.',
    });
  }

  // Transform nested data
  const elder = Array.isArray(groupData.elder) ? groupData.elder[0] : groupData.elder;
  const agency = Array.isArray(groupData.agency) ? groupData.agency[0] : groupData.agency;

  const response: Record<string, unknown> = {
    valid: true,
    care_group_id: groupData.id,
    group_name: groupData.name,
    elder_name: elder ? `${elder.first_name} ${elder.last_name}` : 'Unknown',
    agency_name: agency?.name || '',
    expires_at: groupData.invite_expires_at,
  };

  // If phone provided, find matching pending member
  if (payload.phone) {
    const formattedPhone = formatPhoneNumber(payload.phone);

    const { data: member } = await supabase
      .from('care_group_members')
      .select('id, name, role, relationship, invite_status')
      .eq('care_group_id', groupData.id)
      .eq('phone', formattedPhone)
      .eq('invite_status', 'pending')
      .eq('is_active', true)
      .single();

    if (member) {
      response.member = {
        id: member.id,
        name: member.name,
        role: member.role,
        relationship: member.relationship,
      };
    } else {
      response.member = null;
      response.member_error =
        'No pending invitation found for this phone number in this care group.';
    }
  }

  return jsonResponse(response);
}

// Join the care group — called after OTP verification
async function handleJoin(req: Request): Promise<Response> {
  const payload: JoinGroupRequest = await req.json();
  const formattedPhone = formatPhoneNumber(payload.phone);

  // Use the accept_group_invite SQL function
  const { data: result, error: rpcError } = await supabase.rpc('accept_group_invite', {
    p_invite_code: payload.invite_code,
    p_user_id: payload.user_id,
    p_phone: formattedPhone,
  });

  if (rpcError) {
    console.error('RPC error:', rpcError);
    return jsonResponse({ success: false, error: 'Could not join care group.' }, 400);
  }

  const row = Array.isArray(result) ? result[0] : result;

  if (!row || !row.success) {
    return jsonResponse({
      success: false,
      error: 'Invalid invite code, expired invitation, or no matching member found for your phone number.',
    });
  }

  // Create or update user profile for the member role
  const roleMap: Record<string, string> = {
    caregiver: 'caregiver',
    family_member: 'family_member',
    elder: 'careseeker',
  };

  const userRole = roleMap[row.member_role] || row.member_role;

  // Upsert user profile
  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: payload.user_id,
      phone: formattedPhone,
      role: userRole,
      first_name: row.member_name?.split(' ')[0] || '',
      last_name: row.member_name?.split(' ').slice(1).join(' ') || '',
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.warn('Profile upsert warning:', profileError);
    // Non-fatal: member is still linked to group
  }

  return jsonResponse({
    success: true,
    member_id: row.member_id,
    role: row.member_role,
    name: row.member_name,
    care_group_id: row.care_group_id,
    elder_name: row.elder_first_name
      ? `${row.elder_first_name} ${row.elder_last_name}`
      : 'Unknown',
    navigate_to: getNavigationTarget(row.member_role),
  });
}

function getNavigationTarget(role: string): string {
  switch (role) {
    case 'caregiver':
      return '/(protected)/caregiver/(tabs)';
    case 'family_member':
      return '/(protected)/family/dashboard';
    case 'elder':
      return '/(protected)/careseeker/(tabs)';
    default:
      return '/';
  }
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
