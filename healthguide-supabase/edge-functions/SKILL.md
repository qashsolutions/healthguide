---
name: healthguide-supabase-edge-functions
description: Supabase Edge Functions for HealthGuide backend operations. Includes Stripe webhooks, notification dispatch, EVV verification, report generation, and scheduled jobs. Use when building serverless functions, webhooks, or background processing.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: supabase
  tags: [edge-functions, deno, serverless, webhooks]
---

# HealthGuide Supabase Edge Functions

## Overview
Edge Functions handle operations requiring server-side logic: payment processing, external API calls (Twilio, Stripe), scheduled jobs, and complex business logic that shouldn't run on the client.

## Function Catalog

| Function | Trigger | Purpose |
|----------|---------|---------|
| `stripe-webhook` | HTTP POST | Handle Stripe subscription events |
| `create-checkout-session` | HTTP POST | Create Stripe checkout for new subscription |
| `create-billing-portal-session` | HTTP POST | Generate Stripe billing portal URL |
| `send-push-notification` | HTTP POST | Send FCM push via Expo |
| `send-sms` | HTTP POST | Send SMS via Twilio |
| `notify-check-in` | HTTP POST | Trigger family check-in SMS |
| `notify-check-out` | HTTP POST | Trigger family check-out SMS |
| `verify-evv-location` | HTTP POST | Validate GPS coordinates for EVV |
| `generate-daily-report` | HTTP POST | Compile daily care report |
| `dispatch-daily-reports` | Cron (15m) | Send scheduled daily reports |
| `send-shift-reminders` | Cron (15m) | Push reminders for upcoming shifts |
| `mark-missed-assignments` | Cron (1h) | Update status for missed check-ins |

## Instructions

### Step 1: Project Setup

```bash
# Initialize Supabase project
supabase init

# Create functions directory
supabase functions new stripe-webhook
supabase functions new create-checkout-session
supabase functions new send-push-notification
supabase functions new send-sms
supabase functions new verify-evv-location
```

### Step 2: Shared Utilities

```typescript
// supabase/functions/_shared/supabase-client.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export function getUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
}
```

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
```

```typescript
// supabase/functions/_shared/response.ts
import { corsHeaders } from './cors.ts';

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Step 3: Stripe Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0';
import { getServiceClient } from '../_shared/supabase-client.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from('agencies')
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
        })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from('agencies')
        .update({
          subscription_status: 'canceled',
        })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment succeeded for invoice ${invoice.id}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Update status and potentially notify
      await supabase
        .from('agencies')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', customerId);

      // TODO: Send notification to agency owner
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Step 4: Create Checkout Session

```typescript
// supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0';
import { getServiceClient, getUserClient } from '../_shared/supabase-client.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const PRICE_PER_ELDER = 1500; // $15.00 in cents

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const userClient = getUserClient(authHeader);
    const serviceClient = getServiceClient();

    // Get current user
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse('Unauthorized', 401);

    const { elder_count } = await req.json();

    // Get or create Stripe customer
    const { data: agency } = await serviceClient
      .from('agencies')
      .select('id, stripe_customer_id, email, name')
      .eq('id', user.user_metadata.agency_id)
      .single();

    let customerId = agency?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agency!.email,
        name: agency!.name,
        metadata: { agency_id: agency!.id },
      });
      customerId = customer.id;

      await serviceClient
        .from('agencies')
        .update({ stripe_customer_id: customerId })
        .eq('id', agency!.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'HealthGuide Care Management',
              description: `Care management for ${elder_count} elder(s)`,
            },
            unit_amount: PRICE_PER_ELDER,
            recurring: { interval: 'month' },
          },
          quantity: elder_count,
        },
      ],
      subscription_data: {
        metadata: { agency_id: agency!.id },
      },
      success_url: `${Deno.env.get('APP_URL')}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/onboarding/payment`,
    });

    return jsonResponse({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return errorResponse(error.message, 500);
  }
});
```

### Step 5: EVV Location Verification

```typescript
// supabase/functions/verify-evv-location/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

interface VerifyRequest {
  assignment_id: string;
  latitude: number;
  longitude: number;
  action: 'check_in' | 'check_out';
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getServiceClient();
    const payload: VerifyRequest = await req.json();

    // Get assignment with elder location
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select(`
        id,
        elder_id,
        agency_id,
        elder:elders (
          latitude,
          longitude,
          address
        ),
        agency:agencies (
          evv_radius_meters
        )
      `)
      .eq('id', payload.assignment_id)
      .single();

    if (error || !assignment) {
      return errorResponse('Assignment not found', 404);
    }

    const elderLat = assignment.elder.latitude;
    const elderLng = assignment.elder.longitude;
    const allowedRadius = assignment.agency.evv_radius_meters || 100;

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      payload.latitude,
      payload.longitude,
      elderLat,
      elderLng
    );

    const isWithinRadius = distance <= allowedRadius;

    // Update assignment with location data
    const updateData = payload.action === 'check_in'
      ? {
          check_in_latitude: payload.latitude,
          check_in_longitude: payload.longitude,
          actual_check_in: new Date().toISOString(),
          status: 'checked_in',
          evv_method: 'gps',
        }
      : {
          check_out_latitude: payload.latitude,
          check_out_longitude: payload.longitude,
          actual_check_out: new Date().toISOString(),
          status: 'completed',
        };

    if (isWithinRadius) {
      await supabase
        .from('assignments')
        .update(updateData)
        .eq('id', payload.assignment_id);
    }

    return jsonResponse({
      verified: isWithinRadius,
      distance_meters: Math.round(distance),
      allowed_radius_meters: allowedRadius,
      elder_address: assignment.elder.address,
      action: payload.action,
    });
  } catch (error) {
    console.error('EVV verification error:', error);
    return errorResponse(error.message, 500);
  }
});

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
```

### Step 6: Scheduled Job - Mark Missed Assignments

```typescript
// supabase/functions/mark-missed-assignments/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { jsonResponse } from '../_shared/response.ts';

// Runs every hour via pg_cron or external scheduler
serve(async () => {
  const supabase = getServiceClient();

  // Mark assignments as missed if:
  // 1. Scheduled for yesterday or earlier
  // 2. Still in 'scheduled' status
  // 3. No check-in recorded
  const { data, error } = await supabase
    .from('assignments')
    .update({ status: 'missed' })
    .eq('status', 'scheduled')
    .lt('scheduled_date', new Date().toISOString().split('T')[0])
    .is('actual_check_in', null)
    .select('id');

  if (error) {
    console.error('Error marking missed assignments:', error);
    return jsonResponse({ error: error.message }, 500);
  }

  // Notify agency owners about missed assignments
  const missedIds = data?.map((a) => a.id) || [];

  if (missedIds.length > 0) {
    // Get unique agency owners for these assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        agency:agencies (
          id
        ),
        caregiver:user_profiles (first_name),
        elder:elders (first_name, last_name)
      `)
      .in('id', missedIds);

    // Send notifications (implementation in send-push-notification)
    for (const assignment of assignments || []) {
      // Get agency owner
      const { data: owner } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('agency_id', assignment.agency.id)
        .eq('role', 'agency_owner')
        .single();

      if (owner) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: owner.id,
            title: 'Missed Visit Alert',
            body: `${assignment.caregiver.first_name} missed their visit with ${assignment.elder.first_name} ${assignment.elder.last_name}`,
            type: 'missed_checkout',
          },
        });
      }
    }
  }

  return jsonResponse({
    marked_missed: missedIds.length,
    assignment_ids: missedIds,
  });
});
```

### Step 7: QR Code EVV Fallback

```typescript
// supabase/functions/verify-qr-code/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

interface QRVerifyRequest {
  assignment_id: string;
  qr_code: string;
  action: 'check_in' | 'check_out';
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getServiceClient();
    const payload: QRVerifyRequest = await req.json();

    // Parse QR code (format: healthguide:elder:{elder_id}:{secret})
    const parts = payload.qr_code.split(':');
    if (parts.length !== 4 || parts[0] !== 'healthguide' || parts[1] !== 'elder') {
      return errorResponse('Invalid QR code format', 400);
    }

    const elderIdFromQR = parts[2];
    const secretFromQR = parts[3];

    // Verify assignment belongs to this elder
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        id,
        elder_id,
        elder:elders (qr_secret)
      `)
      .eq('id', payload.assignment_id)
      .single();

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    if (assignment.elder_id !== elderIdFromQR) {
      return errorResponse('QR code does not match assignment', 400);
    }

    // Verify secret
    if (assignment.elder.qr_secret !== secretFromQR) {
      return errorResponse('Invalid QR code', 400);
    }

    // Update assignment
    const updateData = payload.action === 'check_in'
      ? {
          actual_check_in: new Date().toISOString(),
          status: 'checked_in',
          evv_method: 'qr_code',
        }
      : {
          actual_check_out: new Date().toISOString(),
          status: 'completed',
        };

    await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', payload.assignment_id);

    return jsonResponse({
      verified: true,
      method: 'qr_code',
      action: payload.action,
    });
  } catch (error) {
    console.error('QR verification error:', error);
    return errorResponse(error.message, 500);
  }
});
```

### Step 8: Deployment Configuration

```toml
# supabase/config.toml

[functions.stripe-webhook]
verify_jwt = false

[functions.create-checkout-session]
verify_jwt = true

[functions.create-billing-portal-session]
verify_jwt = true

[functions.send-push-notification]
verify_jwt = false  # Called internally

[functions.send-sms]
verify_jwt = false  # Called internally

[functions.verify-evv-location]
verify_jwt = true

[functions.verify-qr-code]
verify_jwt = true

[functions.mark-missed-assignments]
verify_jwt = false  # Cron job

[functions.dispatch-daily-reports]
verify_jwt = false  # Cron job

[functions.send-shift-reminders]
verify_jwt = false  # Cron job
```

### Step 9: Environment Variables

```bash
# .env.local (for local development)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

APP_URL=https://your-app.com
```

```bash
# Set secrets in Supabase
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_PHONE_NUMBER=+1xxx
supabase secrets set APP_URL=https://your-app.com
```

## Troubleshooting

### Function timeout
**Cause:** Long-running operations
**Solution:** Increase timeout in config.toml, optimize queries, use background jobs

### CORS errors
**Cause:** Missing CORS headers
**Solution:** Use shared cors.ts helper, ensure OPTIONS handled

### Webhook signature invalid
**Cause:** Wrong secret or body modification
**Solution:** Use raw body for signature verification, check secret matches

### Environment variables undefined
**Cause:** Secrets not set
**Solution:** Run `supabase secrets set KEY=value` for each variable
