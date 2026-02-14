---
name: healthguide-agency-payments
description: Stripe billing and payment management for HealthGuide agencies. Handle subscription updates, invoices, payment methods, and billing history. Use when building payment settings screens, invoice views, or subscription management.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [payments, stripe, billing, subscriptions]
---

# HealthGuide Agency Payments

## Overview
Agency owners manage their subscription ($15/elder/month) through the app. They can update payment methods, view invoices, and adjust their elder count.

## Key Features

- View current subscription status
- Update payment method
- Adjust elder count (scales billing)
- View invoice history
- Cancel subscription

## Instructions

### Step 1: Billing Settings Screen

```typescript
// app/(protected)/agency/settings/billing.tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { SubscriptionCard } from '@/components/billing/SubscriptionCard';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { InvoicesList } from '@/components/billing/InvoicesList';
import * as WebBrowser from 'expo-web-browser';

interface BillingInfo {
  subscription_status: string;
  current_elder_count: number;
  monthly_amount: number;
  next_billing_date: string;
  payment_method?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export default function BillingScreen() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  async function fetchBillingInfo() {
    const { data, error } = await supabase.functions.invoke('get-billing-info', {
      body: { agency_id: user!.agency_id },
    });

    if (data) setBilling(data);
    setLoading(false);
  }

  async function handleUpdatePaymentMethod() {
    const { data, error } = await supabase.functions.invoke(
      'create-billing-portal-session',
      { body: { agency_id: user!.agency_id } }
    );

    if (data?.url) {
      await WebBrowser.openBrowserAsync(data.url);
      // Refresh after returning
      fetchBillingInfo();
    }
  }

  async function handleUpdateElderCount() {
    Alert.prompt(
      'Update Elder Count',
      'How many elders will you serve?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (value) => {
            const count = parseInt(value || '0', 10);
            if (count < 1) return;

            setLoading(true);
            await supabase.functions.invoke('update-subscription', {
              body: { agency_id: user!.agency_id, elder_count: count },
            });
            fetchBillingInfo();
          },
        },
      ],
      'plain-text',
      billing?.current_elder_count.toString()
    );
  }

  async function handleCancelSubscription() {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure? You will lose access at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await supabase.functions.invoke('cancel-subscription', {
              body: { agency_id: user!.agency_id },
            });
            fetchBillingInfo();
          },
        },
      ]
    );
  }

  if (loading || !billing) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView style={styles.container}>
      <SubscriptionCard
        status={billing.subscription_status}
        elderCount={billing.current_elder_count}
        monthlyAmount={billing.monthly_amount}
        nextBillingDate={billing.next_billing_date}
        onUpdateElderCount={handleUpdateElderCount}
      />

      <PaymentMethodCard
        paymentMethod={billing.payment_method}
        onUpdate={handleUpdatePaymentMethod}
      />

      <InvoicesList agencyId={user!.agency_id} />

      {billing.subscription_status === 'active' && (
        <Button
          title="Cancel Subscription"
          variant="outline"
          onPress={handleCancelSubscription}
          style={styles.cancelButton}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 16,
  },
  cancelButton: {
    marginTop: 24,
    borderColor: '#EF4444',
  },
});
```

### Step 2: Subscription Card Component

```typescript
// components/billing/SubscriptionCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

interface Props {
  status: string;
  elderCount: number;
  monthlyAmount: number;
  nextBillingDate: string;
  onUpdateElderCount: () => void;
}

export function SubscriptionCard({
  status,
  elderCount,
  monthlyAmount,
  nextBillingDate,
  onUpdateElderCount,
}: Props) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#D1FAE5', text: '#065F46' },
    past_due: { bg: '#FEE2E2', text: '#991B1B' },
    canceled: { bg: '#F4F4F5', text: '#52525B' },
    trialing: { bg: '#DBEAFE', text: '#1E40AF' },
  };

  const colors = statusColors[status] || statusColors.active;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {status.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>$15 per elder/month</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Elders</Text>
          <Text style={styles.value}>{elderCount}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Monthly Total</Text>
          <Text style={styles.amount}>${monthlyAmount}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Next Billing</Text>
          <Text style={styles.value}>
            {format(new Date(nextBillingDate), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>

      <Button
        title="Update Elder Count"
        variant="outline"
        onPress={onUpdateElderCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
});
```

### Step 3: Backend - Billing Portal Session

```typescript
// supabase/functions/create-billing-portal-session/index.ts
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
  const { agency_id } = await req.json();

  // Get agency's Stripe customer ID
  const { data: agency } = await supabase
    .from('agencies')
    .select('stripe_customer_id')
    .eq('id', agency_id)
    .single();

  if (!agency?.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: 'No billing account found' }),
      { status: 400 }
    );
  }

  // Create Stripe billing portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: agency.stripe_customer_id,
    return_url: `${Deno.env.get('APP_URL')}/settings/billing`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Step 4: Backend - Update Subscription

```typescript
// supabase/functions/update-subscription/index.ts
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
  const { agency_id, elder_count } = await req.json();

  // Get agency's subscription ID
  const { data: agency } = await supabase
    .from('agencies')
    .select('stripe_subscription_id')
    .eq('id', agency_id)
    .single();

  if (!agency?.stripe_subscription_id) {
    return new Response(
      JSON.stringify({ error: 'No subscription found' }),
      { status: 400 }
    );
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(
    agency.stripe_subscription_id
  );

  // Update quantity (elder count)
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
    })
    .eq('id', agency_id);

  return new Response(
    JSON.stringify({
      success: true,
      elder_count,
      amount: (elder_count * 15 * 100), // cents
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Step 5: Invoices List Component

```typescript
// components/billing/InvoicesList.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { DownloadIcon, CheckIcon, AlertIcon } from '@/components/icons';

interface Invoice {
  id: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  status: 'paid' | 'open' | 'uncollectible' | 'void';
  created: number;
  invoice_pdf: string;
  hosted_invoice_url: string;
}

interface Props {
  agencyId: string;
}

export function InvoicesList({ agencyId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    const { data } = await supabase.functions.invoke('get-invoices', {
      body: { agency_id: agencyId },
    });

    if (data?.invoices) setInvoices(data.invoices);
    setLoading(false);
  }

  function handleViewInvoice(invoice: Invoice) {
    Linking.openURL(invoice.hosted_invoice_url);
  }

  function handleDownloadPDF(invoice: Invoice) {
    Linking.openURL(invoice.invoice_pdf);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invoice History</Text>

      {invoices.length === 0 ? (
        <Text style={styles.empty}>No invoices yet</Text>
      ) : (
        invoices.map((invoice) => (
          <Pressable
            key={invoice.id}
            style={styles.invoiceCard}
            onPress={() => handleViewInvoice(invoice)}
          >
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>{invoice.number}</Text>
              <Text style={styles.invoiceDate}>
                {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
              </Text>
            </View>

            <View style={styles.invoiceAmount}>
              <Text style={styles.amount}>
                ${(invoice.amount_due / 100).toFixed(2)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  invoice.status === 'paid' && styles.statusPaid,
                  invoice.status === 'open' && styles.statusOpen,
                ]}
              >
                {invoice.status === 'paid' ? (
                  <CheckIcon size={12} color="#065F46" />
                ) : (
                  <AlertIcon size={12} color="#92400E" />
                )}
                <Text
                  style={[
                    styles.statusText,
                    invoice.status === 'paid' && styles.statusTextPaid,
                  ]}
                >
                  {invoice.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.downloadButton}
              onPress={() => handleDownloadPDF(invoice)}
            >
              <DownloadIcon size={20} color="#3B82F6" />
            </Pressable>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 24,
  },
  invoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    marginTop: 4,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusOpen: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  statusTextPaid: {
    color: '#065F46',
  },
  downloadButton: {
    padding: 8,
  },
});
```

## Troubleshooting

### Billing portal not opening
**Cause:** Stripe customer not created or URL issue
**Solution:** Verify customer exists and use WebBrowser correctly

### Proration not showing
**Cause:** Stripe proration settings
**Solution:** Set `proration_behavior: 'create_prorations'` on subscription update
