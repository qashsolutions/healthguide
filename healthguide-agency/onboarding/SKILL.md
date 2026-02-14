---
name: healthguide-agency-onboarding
description: Agency owner onboarding and Stripe subscription setup for HealthGuide. Handles agency registration, profile creation, and monthly billing ($15/elder/month). Use when implementing agency signup flow, Stripe integration, or subscription management.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [onboarding, stripe, subscription, billing]
---

# HealthGuide Agency Onboarding

## Overview
Agency owners must complete onboarding before managing caregivers and careseekers. Includes account creation, agency profile setup, and Stripe subscription ($15/elder/month).

## Onboarding Flow

```
1. Create Account (Email/Password)
        ↓
2. Verify Email
        ↓
3. Agency Profile Setup
   - Agency name
   - Contact info
   - Service area
        ↓
4. Stripe Payment Setup
   - Add payment method
   - Subscribe to plan
        ↓
5. Invite First Caregiver
        ↓
6. Dashboard Access
```

## Pricing Model

- **Base Plan**: $15 per elder per month
- **Max Caregivers**: Up to 15 per agency
- **Billing**: Monthly, prorated for mid-month additions

## Instructions

### Step 1: Stripe Setup (Backend)

```typescript
// supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const { agency_id, elder_count } = await req.json();

  // Price ID for $15/elder/month plan
  const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICE_ID,
        quantity: elder_count,
      },
    ],
    subscription_data: {
      metadata: {
        agency_id,
      },
    },
    success_url: `${Deno.env.get('APP_URL')}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${Deno.env.get('APP_URL')}/onboarding/payment`,
    metadata: {
      agency_id,
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Step 2: Stripe Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts
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
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const agencyId = session.metadata?.agency_id;

      // Update agency with subscription info
      await supabase
        .from('agencies')
        .update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          onboarding_completed: true,
        })
        .eq('id', agencyId);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const agencyId = subscription.metadata?.agency_id;

      await supabase
        .from('agencies')
        .update({
          subscription_status: subscription.status,
          current_elder_count: subscription.items.data[0].quantity,
        })
        .eq('id', agencyId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const agencyId = subscription.metadata?.agency_id;

      await supabase
        .from('agencies')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', agencyId);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Handle failed payment - notify agency owner
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Step 3: Agency Profile Screen

```typescript
// app/(auth)/onboarding/profile.tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function AgencyProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    agency_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    service_radius_miles: 25,
  });

  async function handleSubmit() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agencies')
        .insert({
          owner_id: user!.id,
          ...form,
        })
        .select()
        .single();

      if (error) throw error;

      // Update user profile with agency_id
      await supabase
        .from('profiles')
        .update({ agency_id: data.id })
        .eq('id', user!.id);

      router.push('/onboarding/payment');
    } catch (error) {
      console.error('Error creating agency:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Set Up Your Agency</Text>
      <Text style={styles.subtitle}>
        Tell us about your care agency
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Agency Name"
          value={form.agency_name}
          onChangeText={(text) => setForm({ ...form, agency_name: text })}
        />

        <TextInput
          style={styles.input}
          placeholder="Contact Email"
          keyboardType="email-address"
          value={form.contact_email}
          onChangeText={(text) => setForm({ ...form, contact_email: text })}
        />

        <TextInput
          style={styles.input}
          placeholder="Contact Phone"
          keyboardType="phone-pad"
          value={form.contact_phone}
          onChangeText={(text) => setForm({ ...form, contact_phone: text })}
        />

        <TextInput
          style={styles.input}
          placeholder="Street Address"
          value={form.address}
          onChangeText={(text) => setForm({ ...form, address: text })}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="City"
            value={form.city}
            onChangeText={(text) => setForm({ ...form, city: text })}
          />
          <TextInput
            style={[styles.input, styles.stateInput]}
            placeholder="State"
            value={form.state}
            onChangeText={(text) => setForm({ ...form, state: text })}
          />
          <TextInput
            style={[styles.input, styles.zipInput]}
            placeholder="ZIP"
            keyboardType="numeric"
            value={form.zip_code}
            onChangeText={(text) => setForm({ ...form, zip_code: text })}
          />
        </View>

        <Button
          title="Continue to Payment"
          onPress={handleSubmit}
          loading={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  stateInput: {
    width: 80,
  },
  zipInput: {
    width: 100,
  },
});
```

### Step 4: Payment Screen with Stripe

```typescript
// app/(auth)/onboarding/payment.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export default function PaymentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [elderCount, setElderCount] = useState(1);

  async function handleCheckout() {
    setLoading(true);
    try {
      // Get agency ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user!.id)
        .single();

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            agency_id: profile!.agency_id,
            elder_count: elderCount,
          },
        }
      );

      if (error) throw error;

      // Open Stripe checkout in browser
      const result = await WebBrowser.openBrowserAsync(data.url);

      if (result.type === 'success') {
        // Poll for subscription status
        checkSubscriptionStatus(profile!.agency_id);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not start checkout process');
    } finally {
      setLoading(false);
    }
  }

  async function checkSubscriptionStatus(agencyId: string) {
    // Poll every 2 seconds for up to 30 seconds
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data } = await supabase
        .from('agencies')
        .select('subscription_status')
        .eq('id', agencyId)
        .single();

      if (data?.subscription_status === 'active') {
        router.replace('/onboarding/success');
        return;
      }
    }

    Alert.alert('Payment Pending', 'Your payment is being processed.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Plan</Text>

      <View style={styles.priceCard}>
        <Text style={styles.price}>$15</Text>
        <Text style={styles.priceUnit}>per elder / month</Text>

        <View style={styles.features}>
          <Text style={styles.feature}>✓ Unlimited caregivers (up to 15)</Text>
          <Text style={styles.feature}>✓ Scheduling & assignments</Text>
          <Text style={styles.feature}>✓ Electronic visit verification</Text>
          <Text style={styles.feature}>✓ Family notifications</Text>
          <Text style={styles.feature}>✓ Daily reports</Text>
        </View>
      </View>

      <View style={styles.elderSelector}>
        <Text style={styles.label}>How many elders will you serve?</Text>
        <View style={styles.counter}>
          <Button
            title="-"
            variant="outline"
            onPress={() => setElderCount(Math.max(1, elderCount - 1))}
          />
          <Text style={styles.count}>{elderCount}</Text>
          <Button
            title="+"
            variant="outline"
            onPress={() => setElderCount(elderCount + 1)}
          />
        </View>
        <Text style={styles.total}>
          Total: ${elderCount * 15}/month
        </Text>
      </View>

      <Button
        title="Subscribe Now"
        onPress={handleCheckout}
        loading={loading}
      />

      <Text style={styles.disclaimer}>
        You can add or remove elders anytime. Billing is prorated.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  priceUnit: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  features: {
    alignSelf: 'stretch',
  },
  feature: {
    fontSize: 14,
    color: '#374151',
    marginVertical: 4,
  },
  elderSelector: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  count: {
    fontSize: 32,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#3B82F6',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});
```

### Step 5: Update Subscription (Add/Remove Elders)

```typescript
// hooks/useSubscription.ts
import { supabase } from '@/lib/supabase';

export function useSubscription() {
  async function updateElderCount(agencyId: string, newCount: number) {
    const { data, error } = await supabase.functions.invoke(
      'update-subscription',
      {
        body: { agency_id: agencyId, elder_count: newCount },
      }
    );

    if (error) throw error;
    return data;
  }

  async function cancelSubscription(agencyId: string) {
    const { data, error } = await supabase.functions.invoke(
      'cancel-subscription',
      {
        body: { agency_id: agencyId },
      }
    );

    if (error) throw error;
    return data;
  }

  return { updateElderCount, cancelSubscription };
}
```

## Database Schema

See `healthguide-supabase/schema` skill for the `agencies` table with Stripe fields.

## Troubleshooting

### Stripe checkout not opening
**Cause:** WebBrowser not properly configured
**Solution:** Ensure `expo-web-browser` is installed and add to app.json plugins

### Webhook not receiving events
**Cause:** Endpoint not accessible or signature mismatch
**Solution:** Verify webhook secret and ensure Supabase function is deployed

### Subscription not updating after payment
**Cause:** Webhook handler not processing event
**Solution:** Check Supabase function logs for errors
