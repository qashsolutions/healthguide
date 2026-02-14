// HealthGuide QR Code Component
// Generates and displays a QR code for care group invitations.
// Uses react-native-qrcode-svg for generation.

import { View, Text, StyleSheet, Pressable } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface QRCodeProps {
  /** The data to encode (typically a deep link URL) */
  value: string;
  /** Size of the QR code in pixels */
  size?: number;
  /** Background color */
  backgroundColor?: string;
  /** Foreground (dot) color */
  color?: string;
  /** Optional label text below the QR code */
  label?: string;
  /** Optional invite code to display */
  inviteCode?: string;
  /** Called when the QR code area is pressed */
  onPress?: () => void;
}

export function QRCode({
  value,
  size = 200,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  label,
  inviteCode,
  onPress,
}: QRCodeProps) {
  const content = (
    <View style={styles.container}>
      <View style={[styles.qrWrapper, { backgroundColor }]}>
        <QRCodeSVG
          value={value}
          size={size}
          backgroundColor={backgroundColor}
          color={color}
        />
      </View>

      {inviteCode && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Invite Code</Text>
          <Text style={styles.codeText}>
            {inviteCode.length === 8
              ? `${inviteCode.slice(0, 4)}-${inviteCode.slice(4)}`
              : inviteCode}
          </Text>
        </View>
      )}

      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return content;
}

interface QRInviteCardProps {
  /** Deep link URL to encode */
  deepLink: string;
  /** The 8-character invite code */
  inviteCode: string;
  /** Elder's name for context */
  elderName: string;
  /** Called when Share button is pressed */
  onShare: () => void;
  /** Called when Refresh Code is pressed */
  onRefresh?: () => void;
}

/**
 * Full invite card with QR code, invite code display, and share button.
 * Used on the agency care group management screen.
 */
export function QRInviteCard({
  deepLink,
  inviteCode,
  elderName,
  onShare,
  onRefresh,
}: QRInviteCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Share Invitation</Text>
      <Text style={styles.cardSubtitle}>
        Scan this QR code or share the invite code to join {elderName}'s care team
      </Text>

      <QRCode
        value={deepLink}
        size={180}
        inviteCode={inviteCode}
      />

      <View style={styles.actions}>
        <Pressable style={styles.shareButton} onPress={onShare}>
          <Text style={styles.shareButtonText}>Share Invite</Text>
        </Pressable>

        {onRefresh && (
          <Pressable style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>Refresh Code</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing[4],
  },
  pressable: {
    alignItems: 'center',
  },
  qrWrapper: {
    padding: spacing[4],
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeContainer: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  codeText: {
    ...typography.styles.h3,
    color: colors.text.primary,
    letterSpacing: 3,
    fontWeight: '700',
  },
  label: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing[6],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  cardSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
    paddingHorizontal: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    width: '100%',
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[3],
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
  refreshButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing[3],
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    ...typography.styles.label,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
