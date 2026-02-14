// HealthGuide Agency Billing Settings Screen
// Manage subscription, payment method, and view invoices

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  SubscriptionCard,
  PaymentMethodCard,
  InvoicesList,
} from '@/components/billing';
import { Button } from '@/components/ui';

interface BillingInfo {
  subscription_status: string;
  current_elder_count: number;
  monthly_amount: number;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  payment_method: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

export default function BillingScreen() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBillingInfo = useCallback(async () => {
    if (!user?.agency_id) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-billing-info', {
        body: { agency_id: user.agency_id },
      });

      if (error) throw error;
      if (data) setBilling(data);
    } catch (error) {
      console.error('Error fetching billing info:', error);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user?.agency_id]);

  useEffect(() => {
    fetchBillingInfo();
  }, [fetchBillingInfo]);

  async function handleUpdatePaymentMethod() {
    if (!user?.agency_id) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        'create-billing-portal-session',
        { body: { agency_id: user.agency_id } }
      );

      if (error) throw error;

      if (data?.url) {
        await WebBrowser.openBrowserAsync(data.url);
        // Refresh after returning from portal
        fetchBillingInfo();
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      Alert.alert('Error', 'Could not open billing portal. Please try again.');
    }
  }

  async function handleUpdateElderCount() {
    if (!billing) return;

    Alert.prompt(
      'Update Elder Count',
      `Current: ${billing.current_elder_count} elders\nEnter the new number of elders you serve:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (value: string | undefined) => {
            const count = parseInt(value || '0', 10);
            if (count < 1) {
              Alert.alert('Invalid', 'Please enter at least 1 elder');
              return;
            }

            if (count === billing.current_elder_count) return;

            const newAmount = (count * 15).toFixed(2);
            const changeText = count > billing.current_elder_count
              ? `This will increase your monthly bill to $${newAmount}.`
              : `This will decrease your monthly bill to $${newAmount}.`;

            Alert.alert(
              'Confirm Change',
              changeText + '\n\nProrated charges will apply.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      await supabase.functions.invoke('update-subscription', {
                        body: { agency_id: user?.agency_id, elder_count: count },
                      });
                      fetchBillingInfo();
                    } catch (error) {
                      console.error('Error updating subscription:', error);
                      Alert.alert('Error', 'Could not update subscription.');
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ],
      'plain-text',
      billing.current_elder_count.toString()
    );
  }

  async function handleCancelSubscription() {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel?\n\nYou will lose access at the end of your current billing period. This action cannot be undone.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await supabase.functions.invoke('cancel-subscription', {
                body: { agency_id: user?.agency_id },
              });
              fetchBillingInfo();
            } catch (error) {
              console.error('Error canceling subscription:', error);
              Alert.alert('Error', 'Could not cancel subscription.');
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  if (loading && !billing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Billing</Text>
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Billing</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchBillingInfo();
            }}
          />
        }
      >
        {billing && (
          <>
            <SubscriptionCard
              status={billing.subscription_status}
              elderCount={billing.current_elder_count}
              monthlyAmount={billing.monthly_amount}
              nextBillingDate={billing.next_billing_date}
              trialEndsAt={billing.trial_ends_at}
              onUpdateElderCount={handleUpdateElderCount}
            />

            <PaymentMethodCard
              paymentMethod={billing.payment_method}
              onUpdate={handleUpdatePaymentMethod}
            />

            <InvoicesList agencyId={user?.agency_id || ''} />

            {billing.subscription_status === 'active' && (
              <Button
                title="Cancel Subscription"
                variant="outline"
                onPress={handleCancelSubscription}
                style={styles.cancelButton}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  cancelButton: {
    marginTop: 8,
    borderColor: '#EF4444',
  },
});
