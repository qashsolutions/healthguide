// HealthGuide Payment Method Card Component
// Displays and allows updating the payment method

import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { createShadow } from '@/theme/spacing';

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod | null;
  onUpdate: () => void;
}

function VisaIcon({ size = 40 }) {
  return (
    <Svg width={size} height={size * 0.64} viewBox="0 0 50 32" fill="none">
      <Rect width="50" height="32" rx="4" fill="#1A1F71" />
      <Path
        d="M21.5 21H18.9L20.5 11H23.1L21.5 21ZM17.3 11L14.8 18L14.5 16.5L13.6 12.2C13.6 12.2 13.5 11 11.9 11H7.1L7 11.3C7 11.3 8.8 11.7 10.9 13L13.1 21H15.8L20 11H17.3ZM37.5 21H40L37.8 11H35.7C35.7 11 35.1 11 34.6 11.7L30.5 21H33.2L33.7 19.5H37L37.5 21ZM34.5 17.3L35.9 13.5L36.7 17.3H34.5ZM30.5 13.5L30.8 11.7C30.8 11.7 29.1 11 27.3 11C25.4 11 21.9 11.8 21.9 14.8C21.9 17.6 25.9 17.6 25.9 19.1C25.9 20.6 22.3 20.2 20.7 18.9L20.4 20.8C20.4 20.8 22.1 21.7 24.6 21.7C27.1 21.7 29.1 20.4 29.1 17.9C29.1 15.3 25.1 15.1 25.1 13.8C25.1 12.5 27.9 12.7 29.3 13.5H30.5Z"
        fill="white"
      />
    </Svg>
  );
}

function MastercardIcon({ size = 40 }) {
  return (
    <Svg width={size} height={size * 0.64} viewBox="0 0 50 32" fill="none">
      <Rect width="50" height="32" rx="4" fill="#252525" />
      <Circle cx="20" cy="16" r="8" fill="#EB001B" />
      <Circle cx="30" cy="16" r="8" fill="#F79E1B" />
      <Path d="M25 10.5C26.8 12 28 14.3 28 16.9C28 19.5 26.8 21.8 25 23.3C23.2 21.8 22 19.5 22 16.9C22 14.3 23.2 12 25 10.5Z" fill="#FF5F00" />
    </Svg>
  );
}

function AmexIcon({ size = 40 }) {
  return (
    <Svg width={size} height={size * 0.64} viewBox="0 0 50 32" fill="none">
      <Rect width="50" height="32" rx="4" fill="#006FCF" />
      <Path d="M7 16L10 11H13L16 16L19 11H22L17 21H14L11 16L8 21H5L10 11H7V16Z" fill="white" />
      <Path d="M23 11H33V13H26V15H32V17H26V19H33V21H23V11Z" fill="white" />
      <Path d="M35 11H38L41 15L44 11H47L42 16L47 21H44L41 17L38 21H35L40 16L35 11Z" fill="white" />
    </Svg>
  );
}

function GenericCardIcon({ size = 40 }) {
  return (
    <Svg width={size} height={size * 0.64} viewBox="0 0 50 32" fill="none">
      <Rect width="50" height="32" rx="4" fill="#E5E7EB" />
      <Rect x="6" y="10" width="12" height="8" rx="1" fill="#9CA3AF" />
      <Rect x="6" y="22" width="20" height="2" rx="1" fill="#9CA3AF" />
    </Svg>
  );
}

function getCardIcon(brand: string, size = 40) {
  switch (brand.toLowerCase()) {
    case 'visa':
      return <VisaIcon size={size} />;
    case 'mastercard':
      return <MastercardIcon size={size} />;
    case 'amex':
    case 'american_express':
      return <AmexIcon size={size} />;
    default:
      return <GenericCardIcon size={size} />;
  }
}

export function PaymentMethodCard({ paymentMethod, onUpdate }: PaymentMethodCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Method</Text>
      </View>

      {paymentMethod ? (
        <View style={styles.methodContainer}>
          <View style={styles.cardDisplay}>
            {getCardIcon(paymentMethod.brand)}
            <View style={styles.cardInfo}>
              <Text style={styles.cardBrand}>
                {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)}
              </Text>
              <Text style={styles.cardNumber}>•••• {paymentMethod.last4}</Text>
            </View>
            <Text style={styles.cardExpiry}>
              {String(paymentMethod.exp_month).padStart(2, '0')}/{String(paymentMethod.exp_year).slice(-2)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noMethod}>
          <GenericCardIcon size={48} />
          <Text style={styles.noMethodText}>No payment method added</Text>
        </View>
      )}

      <Pressable style={styles.updateButton} onPress={onUpdate}>
        <Text style={styles.updateButtonText}>
          {paymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
        </Text>
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
    ...createShadow(2, 0.05, 8, 2),
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  methodContainer: {
    marginBottom: 16,
  },
  cardDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  cardExpiry: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  noMethod: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  noMethodText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
