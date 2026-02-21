// HealthGuide Emergency SOS Button & Modal
// Floating red SOS button shown during active visits
// Opens emergency modal with 911, family contacts, incident logging

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { AlertIcon, PhoneIcon, CloseIcon, PersonIcon, CheckIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface EmergencySOSProps {
  visitId: string;
  elderName: string;
  emergencyContacts: EmergencyContact[];
}

export function EmergencySOS({ visitId, elderName, emergencyContacts }: EmergencySOSProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [incidentNotes, setIncidentNotes] = useState('');
  const [calledType, setCalledType] = useState<string | null>(null);

  async function logEmergency(type: '911_called' | 'family_called' | 'other', notes?: string) {
    if (!user?.id) return;
    setLogging(true);

    try {
      await supabase.from('visit_emergencies').insert({
        visit_id: visitId,
        reported_by: user.id,
        emergency_type: type,
        notes: notes || null,
      });

      // Update visit status to emergency
      await supabase
        .from('visits')
        .update({ status: 'emergency' })
        .eq('id', visitId);

      // Notify agency (non-blocking)
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            visitId,
            title: 'Emergency Alert',
            body: `Emergency reported during visit with ${elderName}`,
            data: { type: 'visit_emergency', visitId },
          },
        });
      } catch {
        // Non-critical
      }

      setCalledType(type);
      setLogged(true);
    } catch (err) {
      console.error('Error logging emergency:', err);
    } finally {
      setLogging(false);
    }
  }

  function handleCall911() {
    logEmergency('911_called', 'Called 911');
    Linking.openURL('tel:911').catch(() => {
      const msg = 'Could not open phone dialer. Please dial 911 manually.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Dial 911', msg);
    });
  }

  function handleCallContact(contact: EmergencyContact) {
    logEmergency('family_called', `Called ${contact.name} (${contact.relationship})`);
    Linking.openURL(`tel:${contact.phone.replace(/\D/g, '')}`).catch(() => {
      const msg = `Could not call ${contact.name}. Number: ${contact.phone}`;
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Call Failed', msg);
    });
  }

  function handleClose() {
    setShowModal(false);
    // Reset state after close
    setTimeout(() => {
      setLogged(false);
      setCalledType(null);
      setIncidentNotes('');
    }, 300);
  }

  return (
    <>
      {/* Floating SOS Button */}
      <Pressable
        style={styles.sosButton}
        onPress={() => setShowModal(true)}
        accessibilityLabel="Emergency SOS"
        accessibilityRole="button"
      >
        <AlertIcon size={22} color={colors.white} />
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>

      {/* Emergency Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.emergencyBadge}>
              <AlertIcon size={24} color={colors.white} />
              <Text style={styles.emergencyTitle}>Emergency</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <CloseIcon size={24} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.elderLabel}>
              Visit with {elderName}
            </Text>

            {/* Logged confirmation */}
            {logged && (
              <View style={styles.loggedBanner}>
                <CheckIcon size={18} color={colors.success[700]} />
                <Text style={styles.loggedText}>
                  Emergency recorded. Agency has been notified.
                </Text>
              </View>
            )}

            {/* Call 911 — Primary action */}
            <Pressable style={styles.call911Button} onPress={handleCall911}>
              <PhoneIcon size={32} color={colors.white} />
              <View>
                <Text style={styles.call911Text}>Call 911</Text>
                <Text style={styles.call911Sub}>For immediate medical emergency</Text>
              </View>
            </Pressable>

            {/* Emergency contacts */}
            {emergencyContacts.length > 0 && (
              <View style={styles.contactsSection}>
                <Text style={styles.sectionTitle}>Family / Emergency Contacts</Text>
                {emergencyContacts.map((contact, index) => (
                  <Pressable
                    key={index}
                    style={styles.contactCard}
                    onPress={() => handleCallContact(contact)}
                  >
                    <View style={styles.contactInfo}>
                      <View style={styles.contactAvatar}>
                        <PersonIcon size={20} color={colors.primary[500]} />
                      </View>
                      <View>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactRelation}>{contact.relationship}</Text>
                      </View>
                    </View>
                    <View style={styles.callBadge}>
                      <PhoneIcon size={16} color={colors.primary[600]} />
                      <Text style={styles.callBadgeText}>Call</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Safety reminders */}
            <View style={styles.safetySection}>
              <Text style={styles.sectionTitle}>Safety Reminders</Text>
              <View style={styles.safetyCard}>
                <Text style={styles.safetyItem}>{'\u2022'} Stay calm and ensure the elder is safe</Text>
                <Text style={styles.safetyItem}>{'\u2022'} Do NOT attempt medical procedures</Text>
                <Text style={styles.safetyItem}>{'\u2022'} If elder falls, do NOT move them</Text>
                <Text style={styles.safetyItem}>{'\u2022'} Stay with the elder until help arrives</Text>
                <Text style={styles.safetyItem}>{'\u2022'} Note the time and what happened</Text>
              </View>
            </View>

            {/* Additional resources */}
            <View style={styles.resourcesSection}>
              <Text style={styles.sectionTitle}>Other Resources</Text>
              <Pressable
                style={styles.resourceRow}
                onPress={() => Linking.openURL('tel:988').catch(() => {})}
              >
                <Text style={styles.resourceText}>988 Suicide & Crisis Lifeline</Text>
                <PhoneIcon size={14} color={colors.text.secondary} />
              </Pressable>
              <Pressable
                style={styles.resourceRow}
                onPress={() => Linking.openURL('tel:18007996898').catch(() => {})}
              >
                <Text style={styles.resourceText}>Elder Abuse Hotline</Text>
                <PhoneIcon size={14} color={colors.text.secondary} />
              </Pressable>
            </View>
          </ScrollView>

          {/* Close button at bottom */}
          <View style={styles.modalFooter}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close Emergency Panel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Floating SOS button
  sosButton: {
    position: 'absolute',
    bottom: 100,
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error[600],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius['2xl'],
    elevation: 8,
    shadowColor: colors.error[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 999,
  },
  sosText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 1,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    paddingTop: spacing[12],
    backgroundColor: colors.error[600],
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  emergencyTitle: {
    ...typography.styles.h2,
    color: colors.white,
    fontWeight: '800',
  },
  modalContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  elderLabel: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    textAlign: 'center',
  },

  // Logged banner
  loggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.success[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.success[200],
    marginBottom: spacing[4],
  },
  loggedText: {
    ...typography.styles.bodySmall,
    color: colors.success[700],
    fontWeight: '600',
    flex: 1,
  },

  // Call 911
  call911Button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.error[600],
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[5],
  },
  call911Text: {
    ...typography.styles.h2,
    color: colors.white,
    fontWeight: '800',
  },
  call911Sub: {
    ...typography.styles.bodySmall,
    color: colors.error[100],
    marginTop: 2,
  },

  // Contacts
  contactsSection: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    ...typography.styles.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[2],
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  contactRelation: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius['2xl'],
  },
  callBadgeText: {
    ...typography.styles.bodySmall,
    color: colors.primary[600],
    fontWeight: '700',
  },

  // Safety
  safetySection: {
    marginBottom: spacing[5],
  },
  safetyCard: {
    backgroundColor: colors.warning[50],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning[200],
    gap: spacing[2],
  },
  safetyItem: {
    ...typography.styles.body,
    color: colors.warning[800],
    lineHeight: 22,
  },

  // Resources
  resourcesSection: {
    marginBottom: spacing[4],
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  resourceText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },

  // Footer
  modalFooter: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  closeButton: {
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
