// HealthGuide Family Invitation Edge Function
// DEPRECATED: Replaced by create-care-group and join-care-group edge functions.
// The Care Group system uses native OS Share Sheet and QR codes instead of Twilio SMS.
// This function is kept temporarily for backward compatibility.
// TODO: Remove after confirming all clients use the new care group flow.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
const APP_DOWNLOAD_URL = Deno.env.get('APP_DOWNLOAD_URL') || 'https://healthguide.app/download';

interface InviteFamilyRequest {
  elder_id: string;
  name: string;
  phone: string;
  relationship: string;
}

serve(async (req) => {
  try {
    console.warn('[DEPRECATED] send-family-invitation called. Use create-care-group instead.');
    const payload: InviteFamilyRequest = await req.json();

    // Get elder and agency info
    const { data: elder, error: elderError } = await supabase
      .from('elders')
      .select(`
        first_name,
        last_name,
        agency:agencies (name)
      `)
      .eq('id', payload.elder_id)
      .single();

    if (elderError || !elder) {
      return new Response(
        JSON.stringify({ success: false, error: 'Elder not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique invitation code (6 alphanumeric characters)
    const invitationCode = generateInvitationCode();

    // Create family member record
    const { data: familyMember, error: createError } = await supabase
      .from('family_members')
      .insert({
        elder_id: payload.elder_id,
        name: payload.name,
        phone: payload.phone,
        relationship: payload.relationship,
        invitation_code: invitationCode,
        invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        invite_status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS invitation if Twilio is configured
    let smsResult = null;
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      const elderName = `${elder.first_name} ${elder.last_name}`;
      const agencyName = elder.agency.name;

      const message = `You've been invited to track ${elderName}'s care on HealthGuide by ${agencyName}.\n\nDownload the app and use code: ${invitationCode}\n\n${APP_DOWNLOAD_URL}\n\nThis invitation expires in 7 days.`;

      const formattedPhone = formatPhoneNumber(payload.phone);

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

        const formData = new URLSearchParams();
        formData.append('To', formattedPhone);
        formData.append('From', TWILIO_PHONE_NUMBER);
        formData.append('Body', message);

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: formData.toString(),
        });

        const twilioResult = await twilioResponse.json();

        // Log SMS in database
        await supabase.from('sms_invitations').insert({
          family_member_id: familyMember.id,
          phone: formattedPhone,
          invitation_code: invitationCode,
          message_type: 'invitation',
          twilio_sid: twilioResult.sid,
          status: twilioResult.error_code ? 'failed' : 'sent',
          sent_at: new Date().toISOString(),
          error_message: twilioResult.error_message,
        });

        smsResult = {
          sent: !twilioResult.error_code,
          twilio_sid: twilioResult.sid,
        };
      } catch (smsError) {
        smsResult = { sent: false, error: smsError.message };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        family_member_id: familyMember.id,
        invitation_code: invitationCode,
        sms: smsResult,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateInvitationCode(): string {
  // Use uppercase letters and numbers, excluding ambiguous characters (0, O, I, L, 1)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Add +1 for US numbers if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}
