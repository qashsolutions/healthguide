// HealthGuide Careseeker Onboarding - Address Step
// Collects address for EVV verification with geocoding

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
// Geocoding via free Nominatim API (expo-location geocoding removed in SDK 49)
import { LargeInput } from '@/components/ui/LargeInput';
import { Button } from '@/components/ui/Button';
import Svg, { Path } from 'react-native-svg';

interface AddressData {
  address: string;
  apartment: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
}

interface Props {
  data: AddressData;
  onUpdate: (data: Partial<AddressData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

function CheckIcon({ size = 20, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AddressStep({ data, onUpdate, onNext, onBack }: Props) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const verifyAddress = async () => {
    setVerifying(true);
    setVerified(false);

    try {
      const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip_code}`;
      const q = encodeURIComponent(fullAddress);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
        { headers: { 'User-Agent': 'HealthGuide/1.0' } }
      );
      const results = await res.json();

      if (results.length > 0) {
        onUpdate({
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon),
        });
        setVerified(true);
        setTimeout(() => onNext(), 500); // Brief pause to show checkmark
      } else {
        Alert.alert(
          'Address Not Found',
          'We could not verify this address. Please check the details and try again.',
          [
            { text: 'Edit Address', style: 'cancel' },
            {
              text: 'Continue Anyway',
              onPress: () => {
                onUpdate({ latitude: 0, longitude: 0 });
                onNext();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert(
        'Verification Failed',
        'Could not verify the address. Would you like to continue without verification?',
        [
          { text: 'Edit Address', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              onUpdate({ latitude: 0, longitude: 0 });
              onNext();
            },
          },
        ]
      );
    }

    setVerifying(false);
  };

  const formatZipCode = (text: string) => {
    return text.replace(/\D/g, '').slice(0, 5);
  };

  const isValid =
    data.address.trim() &&
    data.city.trim() &&
    data.state &&
    data.zip_code.length === 5;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home Address</Text>
      <Text style={styles.subtitle}>
        This address is used to verify caregiver check-ins. Please ensure it's accurate.
      </Text>

      <LargeInput
        label="Street Address"
        value={data.address}
        onChangeText={(text) => {
          setVerified(false);
          onUpdate({ address: text });
        }}
        placeholder="123 Main Street"
        autoCapitalize="words"
        autoComplete="street-address"
        accessibilityLabel="Street address"
      />

      <LargeInput
        label="Apartment/Unit (Optional)"
        value={data.apartment}
        onChangeText={(text) => onUpdate({ apartment: text })}
        placeholder="Apt 4B, Suite 100, etc."
        accessibilityLabel="Apartment or unit number"
      />

      <LargeInput
        label="City"
        value={data.city}
        onChangeText={(text) => {
          setVerified(false);
          onUpdate({ city: text });
        }}
        placeholder="City name"
        autoCapitalize="words"
        autoComplete="postal-address-locality"
        accessibilityLabel="City"
      />

      <View style={styles.row}>
        <View style={styles.stateContainer}>
          <Text style={styles.inputLabel}>State</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stateScroll}
            contentContainerStyle={styles.stateContent}
          >
            {US_STATES.map((state) => (
              <Button
                key={state}
                title={state}
                variant={data.state === state ? 'primary' : 'outline'}
                size="small"
                onPress={() => {
                  setVerified(false);
                  onUpdate({ state });
                }}
                style={styles.stateButton}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <LargeInput
        label="ZIP Code"
        value={data.zip_code}
        onChangeText={(text) => {
          setVerified(false);
          onUpdate({ zip_code: formatZipCode(text) });
        }}
        placeholder="12345"
        keyboardType="number-pad"
        maxLength={5}
        autoComplete="postal-code"
        accessibilityLabel="ZIP code"
      />

      {verified && (
        <View style={styles.verifiedBanner}>
          <CheckIcon />
          <Text style={styles.verifiedText}>Address verified!</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
        />
        <Button
          title={verifying ? 'Verifying...' : 'Verify & Continue'}
          onPress={verifyAddress}
          disabled={!isValid || verifying}
          style={styles.nextButton}
          accessibilityLabel="Verify address and continue"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  row: {
    marginBottom: 16,
  },
  stateContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  stateScroll: {
    maxHeight: 48,
  },
  stateContent: {
    gap: 8,
    paddingRight: 16,
  },
  stateButton: {
    minWidth: 48,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    marginTop: 16,
  },
  verifiedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
