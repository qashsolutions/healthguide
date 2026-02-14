// HealthGuide Update Subscription Edge Function
// Updates the subscription elder count (quantity)

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
    const { agency_id, elder_count } = await req.json();

    if (!elder_count || elder_count < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid elder count' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get agency's subscription ID
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('stripe_subscription_id, current_elder_count')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!agency.stripe_subscription_id) {
      // No subscription yet - just update local count
      await supabase
        .from('agencies')
        .update({ current_elder_count: elder_count })
        .eq('id', agency_id);

      return new Response(
        JSON.stringify({
          success: true,
          elder_count,
          monthly_amount: elder_count * 1500,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(
      agency.stripe_subscription_id
    );

    if (!subscription.items.data[0]) {
      return new Response(
        JSON.stringify({ error: 'No subscription items found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update quantity (elder count) with proration
    const updatedSubscription = await stripe.subscriptions.update(
      agency.stripe_subscription_id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            quantity: elder_count,
          },
        ],
        proration_behavior: 'create_prorations',
      }
    );

    // Update local database
    await supabase
      .from('agencies')
      .update({
        current_elder_count: elder_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency_id);

    return new Response(
      JSON.stringify({
        success: true,
        elder_count,
        monthly_amount: elder_count * 1500,
        proration_applied: true,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
