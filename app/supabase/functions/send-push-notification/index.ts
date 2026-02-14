// HealthGuide Push Notification Edge Function
// Sends notifications via Expo Push API.
// Supports all care group member roles: caregiver, family_member, elder.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: 'default' | null;
  categoryId?: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: 'default' | null;
  categoryId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

serve(async (req) => {
  try {
    const payload: PushNotificationRequest = await req.json();

    // Get user's active device tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('expo_push_token')
      .eq('user_id', payload.user_id)
      .eq('is_active', true);

    if (tokenError) {
      return new Response(
        JSON.stringify({ success: false, error: tokenError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active push tokens for user' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build messages for each token
    const messages: ExpoPushMessage[] = tokens.map(({ expo_push_token }) => ({
      to: expo_push_token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      badge: payload.badge || 1,
      sound: payload.sound ?? 'default',
      categoryId: payload.categoryId,
    }));

    // Send to Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const tickets: ExpoPushTicket[] = result.data || [];

    // Handle invalid tokens (remove from database)
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        // Mark token as inactive
        await supabase
          .from('device_tokens')
          .update({ is_active: false })
          .eq('expo_push_token', tokens[i].expo_push_token);
      }
    }

    // Log notification in database
    await supabase.from('notifications').insert({
      user_id: payload.user_id,
      type: payload.data?.type || 'general',
      title: payload.title,
      body: payload.body,
      data: JSON.stringify(payload.data),
      sent_at: new Date().toISOString(),
    });

    const successCount = tickets.filter((t) => t.status === 'ok').length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        sent: successCount,
        total: tickets.length,
        tickets,
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
