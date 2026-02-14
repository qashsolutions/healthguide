// HealthGuide Stripe Webhook Handler
// Processes Stripe events for subscription and payment updates

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

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 400 }
    );
  }

  console.log('Received Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get agency by Stripe customer ID
        const { data: agency } = await supabase
          .from('agencies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (agency) {
          const quantity = subscription.items.data[0]?.quantity || 0;
          const status = subscription.cancel_at_period_end ? 'canceled' : subscription.status;

          await supabase
            .from('agencies')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: status,
              current_elder_count: quantity,
              billing_cycle_anchor: new Date(subscription.billing_cycle_anchor * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', agency.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('agencies')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get agency
        const { data: agency } = await supabase
          .from('agencies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (agency) {
          // Upsert invoice record
          await supabase
            .from('invoices')
            .upsert({
              agency_id: agency.id,
              stripe_invoice_id: invoice.id,
              invoice_number: invoice.number,
              amount_due: invoice.amount_due,
              amount_paid: invoice.amount_paid,
              currency: invoice.currency,
              status: 'paid',
              invoice_pdf: invoice.invoice_pdf,
              hosted_invoice_url: invoice.hosted_invoice_url,
              period_start: invoice.period_start
                ? new Date(invoice.period_start * 1000).toISOString()
                : null,
              period_end: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString()
                : null,
              paid_at: new Date().toISOString(),
            }, {
              onConflict: 'stripe_invoice_id',
            });

          // Update subscription status to active
          await supabase
            .from('agencies')
            .update({
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', agency.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: agency } = await supabase
          .from('agencies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (agency) {
          // Upsert invoice record
          await supabase
            .from('invoices')
            .upsert({
              agency_id: agency.id,
              stripe_invoice_id: invoice.id,
              invoice_number: invoice.number,
              amount_due: invoice.amount_due,
              amount_paid: 0,
              currency: invoice.currency,
              status: 'open',
              invoice_pdf: invoice.invoice_pdf,
              hosted_invoice_url: invoice.hosted_invoice_url,
              period_start: invoice.period_start
                ? new Date(invoice.period_start * 1000).toISOString()
                : null,
              period_end: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString()
                : null,
            }, {
              onConflict: 'stripe_invoice_id',
            });

          // Update subscription status
          await supabase
            .from('agencies')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', agency.id);
        }
        break;
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;

        if (customer.invoice_settings?.default_payment_method) {
          const pm = await stripe.paymentMethods.retrieve(
            customer.invoice_settings.default_payment_method as string
          );

          const { data: agency } = await supabase
            .from('agencies')
            .select('id')
            .eq('stripe_customer_id', customer.id)
            .single();

          if (agency && pm.card) {
            // Upsert payment method
            await supabase
              .from('payment_methods')
              .upsert({
                agency_id: agency.id,
                stripe_payment_method_id: pm.id,
                card_brand: pm.card.brand,
                card_last4: pm.card.last4,
                card_exp_month: pm.card.exp_month,
                card_exp_year: pm.card.exp_year,
                is_default: true,
              }, {
                onConflict: 'stripe_payment_method_id',
              });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
