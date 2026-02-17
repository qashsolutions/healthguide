// HealthGuide Elder Family Calls Screen
// Per healthguide-community/elder-engagement skill - Large video call buttons

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius, shadows } from '@/theme/spacing';
import { PhoneIcon, PersonIcon, SOSIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hapticFeedback } from '@/utils/haptics';

interface VideoContact {
  id: string;
  name: string;
  relationship: string;
  photo_url: string | null;
  video_call_link: string;
  is_favorite: boolean;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

const AVATAR_COLORS: Record<string, string> = {
  daughter: '#EC4899',
  son: '#3B82F6',
  granddaughter: '#F472B6',
  grandson: '#60A5FA',
  wife: '#EC4899',
  husband: '#3B82F6',
  sister: '#EC4899',
  brother: '#3B82F6',
  friend: '#8B5CF6',
  niece: '#F472B6',
  nephew: '#60A5FA',
};

function getAvatarColor(relationship: string): string {
  return AVATAR_COLORS[relationship?.toLowerCase()] || '#8B5CF6';
}

export default function ElderCallsScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<VideoContact[]>([]);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchContacts();
      fetchEmergencyContact();
    }
  }, [user?.id]);

  async function fetchContacts() {
    try {
      const { data, error } = await supabase
        .from('family_video_contacts')
        .select('id, name, relationship, photo_url, video_call_link, is_favorite')
        .eq('elder_id', user!.id)
        .order('is_favorite', { ascending: false })
        .order('name');

      if (!error && data) {
        setContacts(data);
      }
    } catch (err) {
      console.error('Error fetching video contacts:', err);
    }
    setLoading(false);
  }

  async function fetchEmergencyContact() {
    try {
      // First try emergency_contacts table
      const { data: ecData } = await supabase
        .from('emergency_contacts')
        .select('name, relationship, phone')
        .eq('elder_id', user!.id)
        .order('created_at')
        .limit(1)
        .single();

      if (ecData?.phone) {
        setEmergencyContact(ecData);
        return;
      }

      // Fall back to elders table emergency_phone
      const { data: elderData } = await supabase
        .from('elders')
        .select('emergency_contact, emergency_phone')
        .eq('id', user!.id)
        .single();

      if (elderData?.emergency_phone) {
        setEmergencyContact({
          name: elderData.emergency_contact || 'Emergency',
          relationship: '',
          phone: elderData.emergency_phone,
        });
      }
    } catch (err) {
      console.error('Error fetching emergency contact:', err);
    }
  }

  async function handleCall(contact: VideoContact) {
    await hapticFeedback('heavy');
    try {
      await Linking.openURL(contact.video_call_link);
      // Update call stats
      await supabase
        .from('family_video_contacts')
        .update({
          last_call_at: new Date().toISOString(),
          call_count: (contact as any).call_count ? (contact as any).call_count + 1 : 1,
        })
        .eq('id', contact.id);
    } catch (err) {
      console.error('Error opening video call:', err);
    }
  }

  async function handleEmergencyCall() {
    if (!emergencyContact?.phone) return;
    await hapticFeedback('heavy');
    try {
      await Linking.openURL(`tel:${emergencyContact.phone}`);
    } catch (err) {
      console.error('Error making emergency call:', err);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.careseeker} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.title}>Family</Text>
        <Text style={styles.subtitle}>Tap to call</Text>

        {/* Contact List */}
        <View style={styles.contactList}>
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <Pressable
                key={contact.id}
                style={({ pressed }) => [
                  styles.contactButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleCall(contact)}
              >
                <View style={styles.avatarContainer}>
                  <PersonIcon size={40} color={getAvatarColor(contact.relationship)} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelation}>{contact.relationship}</Text>
                </View>
                <View style={styles.callIcon}>
                  <PhoneIcon size={32} color={colors.white} />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <PhoneIcon size={56} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No contacts yet</Text>
              <Text style={styles.emptySubtext}>Ask your agency to add video call contacts</Text>
            </View>
          )}
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyLabel}>Need Help?</Text>
          {emergencyContact ? (
            <Pressable
              style={({ pressed }) => [
                styles.emergencyButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleEmergencyCall}
            >
              <SOSIcon size={32} color={colors.white} />
              <Text style={styles.emergencyText}>
                Call {emergencyContact.name}
                {emergencyContact.relationship ? ` (${emergencyContact.relationship})` : ''}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.emergencyButton, styles.emergencyDisabled]}>
              <SOSIcon size={32} color={colors.white} />
              <Text style={styles.emergencyText}>No emergency contact set</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing[6],
  },
  title: {
    ...typography.elder.heading,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[6],
  },
  subtitle: {
    ...typography.elder.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  contactList: {
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    minHeight: touchTargets.elder,
    ...shadows.md,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.elder.heading,
    color: colors.text.primary,
    fontSize: 28,
  },
  contactRelation: {
    ...typography.elder.body,
    color: colors.text.secondary,
    fontSize: 20,
  },
  callIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    ...typography.elder.heading,
    color: colors.text.secondary,
    fontSize: 24,
  },
  emptySubtext: {
    ...typography.elder.body,
    color: colors.text.tertiary,
    fontSize: 18,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  emergencyDisabled: {
    opacity: 0.5,
  },
  emergencySection: {
    alignItems: 'center',
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  emergencyLabel: {
    ...typography.elder.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error[500],
    borderRadius: borderRadius['2xl'],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    gap: spacing[3],
    minWidth: 200,
  },
  emergencyText: {
    ...typography.elder.button,
    color: colors.white,
  },
});
