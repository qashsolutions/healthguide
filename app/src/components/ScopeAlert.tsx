// HealthGuide Scope Alert
// Modal that enforces scope limitations before visits or during onboarding

import { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { AlertIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { SCOPE_ALERT_TEXT } from '@/constants/tasks';

interface Props {
  visible: boolean;
  onAccept: () => void;
  context: 'onboarding' | 'check_in';
  visitId?: string;
}

export function ScopeAlert({ visible, onAccept, context, visitId }: Props) {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    if (!user?.id) return;
    setAccepting(true);

    try {
      await supabase.from('scope_acceptances').insert({
        user_id: user.id,
        visit_id: visitId || null,
        context,
      });
    } catch (error) {
      // Non-blocking: still allow acceptance even if DB insert fails
      console.error('Error recording scope acceptance:', error);
    }

    setAccepting(false);
    onAccept();
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        // Cannot dismiss — must accept
      }}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            <View style={styles.iconRow}>
              <AlertIcon size={32} color={colors.warning[500]} />
            </View>

            <Text style={styles.title}>Scope of Service</Text>

            <ScrollView style={styles.scrollBody} bounces={false}>
              <Text style={styles.bodyText}>{SCOPE_ALERT_TEXT}</Text>
            </ScrollView>

            <Button
              title="I Accept"
              onPress={handleAccept}
              loading={accepting}
              variant="primary"
              size="lg"
              style={styles.button}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    maxHeight: '80%',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    ...typography.styles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  scrollBody: {
    maxHeight: 300,
    marginBottom: spacing[4],
  },
  bodyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
});
