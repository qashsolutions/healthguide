// HealthGuide Subscription Card Component
// Displays current subscription status and elder count

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { format } from 'date-fns';
import Svg, { Path, Circle } from 'react-native-svg';

interface SubscriptionCardProps {
  status: string;
  elderCount: number;
  monthlyAmount: number;
  nextBillingDate: string | null;
  trialEndsAt: string | null;
  onUpdateElderCount: () => void;
}

function CreditCardIcon({ size = 24, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UsersIcon({ size = 20, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SubscriptionCard({
  status,
  elderCount,
  monthlyAmount,
  nextBillingDate,
  trialEndsAt,
  onUpdateElderCount,
}: SubscriptionCardProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#D1FAE5', text: '#065F46', label: 'Active' },
    trialing: { bg: '#DBEAFE', text: '#1E40AF', label: 'Trial' },
    past_due: { bg: '#FEE2E2', text: '#991B1B', label: 'Past Due' },
    canceled: { bg: '#F4F4F5', text: '#52525B', label: 'Canceled' },
    unpaid: { bg: '#FEF3C7', text: '#92400E', label: 'Unpaid' },
  };

  const config = statusConfig[status] || statusConfig.active;
  const formattedAmount = (monthlyAmount / 100).toFixed(2);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CreditCardIcon color="#3B82F6" />
          <Text style={styles.title}>Subscription</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusText, { color: config.text }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Plan Info */}
      <View style={styles.planInfo}>
        <Text style={styles.planName}>HealthGuide Pro</Text>
        <Text style={styles.planPrice}>$15 <Text style={styles.planPer}>per elder / month</Text></Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={styles.detailLabel}>
            <UsersIcon size={18} color="#6B7280" />
            <Text style={styles.detailText}>Active Elders</Text>
          </View>
          <Text style={styles.detailValue}>{elderCount}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailText}>Monthly Total</Text>
          <Text style={styles.detailAmount}>${formattedAmount}</Text>
        </View>

        {status === 'trialing' && trialEndsAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Trial Ends</Text>
            <Text style={styles.detailValue}>
              {format(new Date(trialEndsAt), 'MMM d, yyyy')}
            </Text>
          </View>
        )}

        {status === 'active' && nextBillingDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Next Billing</Text>
            <Text style={styles.detailValue}>
              {format(new Date(nextBillingDate), 'MMM d, yyyy')}
            </Text>
          </View>
        )}
      </View>

      {/* Update Button */}
      <Pressable style={styles.updateButton} onPress={onUpdateElderCount}>
        <Text style={styles.updateButtonText}>Update Elder Count</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  planInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  planPer: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  updateButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
