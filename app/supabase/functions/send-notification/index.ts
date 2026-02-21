// HealthGuide — Unified Send Notification Edge Function
// Stores in-app notification + sends Expo push to all user devices
// Called by app screens with: { userId, title, body, type?, data?, urgent? }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationRequest {
  // Accept both camelCase (from app screens) and snake_case
  userId?: string;
  user_id?: string;
  elderId?: string; // Resolve elder's user_id from elders table
  title: string;
  body: string;
  type?: string;
  data?: Record<string, any>;
  urgent?: boolean;
}

serve(async (req) => {
  try {
    const payload: NotificationRequest = await req.json();

    // Resolve target user_id
    let targetUserId = payload.userId || payload.user_id;

    // If elderId provided, look up the elder's user_id
    if (!targetUserId && payload.elderId) {
      const { data: elder } = await supabase
        .from('elders')
        .select('user_id')
        .eq('id', payload.elderId)
        .single();
      targetUserId = elder?.user_id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No target user specified' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const notificationType = payload.type || payload.data?.type || 'general';

    // 1. Store in-app notification
    // Column is `read` (not `is_read`), `type` is required
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      title: payload.title,
      body: payload.body,
      type: notificationType,
      data: payload.data ? JSON.stringify(payload.data) : null,
      read: false,
    });

    // 2. Get user's active device tokens
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('expo_push_token')
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      // No push tokens — in-app notification was still stored
      return new Response(
        JSON.stringify({ success: true, push_sent: 0, in_app: true }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 3. Send push notification via Expo Push API
    const messages = tokens.map(({ expo_push_token }) => ({
      to: expo_push_token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: payload.urgent ? 'high' : 'normal',
      sound: payload.urgent ? 'default' : null,
      badge: 1,
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const tickets = result.data || [];

    // 4. Handle invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      if (
        tickets[i].status === 'error' &&
        tickets[i].details?.error === 'DeviceNotRegistered'
      ) {
        await supabase
          .from('device_tokens')
          .update({ is_active: false })
          .eq('expo_push_token', tokens[i].expo_push_token);
      }
    }

    const successCount = tickets.filter((t: any) => t.status === 'ok').length;

    return new Response(
      JSON.stringify({ success: true, push_sent: successCount, in_app: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
