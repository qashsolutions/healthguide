// HealthGuide QR Code Check-In Screen
// Per healthguide-caregiver/evv skill - Fallback when GPS unavailable

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { ArrowLeftIcon, QRCodeIcon } from '@/components/icons';
import { hapticFeedback, vibrate } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';

export default function QRCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      // Expected format: healthguide://checkin/{careseeker_id}/{visit_id}
      // or simple format: HG-CHECKIN-{visit_id}

      let isValid = false;

      // Check for URL format
      if (data.startsWith('healthguide://')) {
        const url = new URL(data);
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (pathParts[0] === 'checkin' && pathParts[2] === id) {
          isValid = true;
        }
      }
      // Check for simple format
      else if (data.startsWith('HG-CHECKIN-')) {
        const qrVisitId = data.replace('HG-CHECKIN-', '');
        if (qrVisitId === id) {
          isValid = true;
        }
      }

      if (!isValid) {
        throw new Error('Invalid QR code for this visit');
      }

      // Record check-in to Supabase
      const { error: updateError } = await supabase
        .from('assignments')
        .update({
          status: 'in_progress',
          actual_check_in: new Date().toISOString(),
          check_in_latitude: null,
          check_in_longitude: null,
          check_in_method: 'qr_code',
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error recording QR check-in:', updateError);
        Alert.alert('Check-In Error', 'Could not record check-in. Please try again.');
        setProcessing(false);
        setScanned(false);
        return;
      }

      // Success feedback
      await hapticFeedback('success');
      vibrate(200);

      // Navigate to tasks
      router.replace(`/(protected)/caregiver/visit/${id}/tasks`);

    } catch (error) {
      await hapticFeedback('error');
      Alert.alert(
        'Invalid QR Code',
        "This QR code doesn't match your scheduled visit. Please scan the correct QR code at the client's home.",
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
      setProcessing(false);
    }
  };

  // Camera permission not determined
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <QRCodeIcon size={64} color={colors.neutral[400]} />
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Camera permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Button
            title=""
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon size={24} />}
            onPress={() => router.back()}
          />
          <Text style={styles.headerTitle}>QR Check-In</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.permissionContainer}>
          <QRCodeIcon size={64} color={colors.neutral[400]} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan the QR code at your client's home.
          </Text>
          <Button
            title="Allow Camera Access"
            variant="primary"
            size="lg"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
          <Button
            title="Go Back"
            variant="secondary"
            size="md"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title=""
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={24} color={colors.white} />}
          onPress={() => router.back()}
        />
        <Text style={[styles.headerTitle, { color: colors.white }]}>QR Check-In</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Scan Frame Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {processing
                ? 'Processing...'
                : "Point your camera at the QR code at the client's home"}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          QR code not working? Contact your agency for help.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitle: {
    ...typography.caregiver.label,
    color: colors.white,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.white,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructionContainer: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[6],
  },
  instructionText: {
    ...typography.caregiver.body,
    color: colors.white,
    textAlign: 'center',
    fontSize: 18,
  },
  footer: {
    padding: spacing[6],
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  footerText: {
    ...typography.styles.body,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.background,
  },
  permissionTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  permissionText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  permissionButton: {
    marginBottom: spacing[3],
  },
  backButton: {
    marginTop: spacing[2],
  },
});
