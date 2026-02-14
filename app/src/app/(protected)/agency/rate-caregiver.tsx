// HealthGuide Rate Caregiver Screen
// Full-screen rating submission for agency owners.
// Receives caregiverProfileId and caregiverName via search params.

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ChevronLeftIcon } from '@/components/icons';
import { RatingModal } from '@/components/caregiver/RatingModal';

export default function RateCaregiverScreen() {
  const router = useRouter();
  const { caregiverProfileId, caregiverName } = useLocalSearchParams<{
    caregiverProfileId: string;
    caregiverName: string;
  }>();

  const [showModal, setShowModal] = useState(true);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (!caregiverProfileId || !caregiverName) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeftIcon size={28} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Rate Caregiver</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Missing caregiver information</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RatingModal
        caregiverProfileId={caregiverProfileId}
        caregiverName={caregiverName}
        isVisible={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
});
