// HealthGuide Get Billing Info Edge Function
// Returns agency subscription and payment information

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

    // Get agency billing info from database
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select(`
        stripe_customer_id,
        stripe_subscription_id,
        subscription_status,
        current_elder_count,
        trial_ends_at,
        billing_cycle_anchor
      `)
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate monthly amount (cents)
    const monthlyAmount = agency.current_elder_count * 1500; // $15 per elder

    // Get payment method from Stripe if customer exists
    let paymentMethod = null;

    if (agency.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(agency.stripe_customer_id);

        if (!customer.deleted && customer.invoice_settings?.default_payment_method) {
          const pm = await stripe.paymentMethods.retrieve(
            customer.invoice_settings.default_payment_method as string
          );

          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        }
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
      }
    }

    // Calculate next billing date
    let nextBillingDate = null;
    if (agency.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          agency.stripe_subscription_id
        );
        nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();
      } catch (stripeError) {
        console.error('Stripe subscription error:', stripeError);
      }
    }

    return new Response(
      JSON.stringify({
        subscription_status: agency.subscription_status || 'trialing',
        current_elder_count: agency.current_elder_count || 0,
        monthly_amount: monthlyAmount,
        trial_ends_at: agency.trial_ends_at,
        next_billing_date: nextBillingDate,
        payment_method: paymentMethod,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-billing-info:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
