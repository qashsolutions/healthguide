// HealthGuide Cancel Subscription Edge Function
// Cancels the subscription at period end

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const { agency_id } = await req.json();

    // Get agency's subscription ID
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('stripe_subscription_id')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!agency.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cancel at period end (don't immediately revoke access)
    const canceledSubscription = await stripe.subscriptions.update(
      agency.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update local status
    await supabase
      .from('agencies')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency_id);

    return new Response(
      JSON.stringify({
        success: true,
        cancel_at: new Date(canceledSubscription.cancel_at! * 1000).toISOString(),
        message: 'Subscription will be canceled at the end of the current billing period',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
