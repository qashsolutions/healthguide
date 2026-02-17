// HealthGuide Careseeker Onboarding - Emergency Contacts Step
// Add up to 3 family members for notifications

import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { LargeInput } from '@/components/ui/LargeInput';
import { Button } from '@/components/ui/Button';
import { FamilyIcon } from '@/components/icons';
import * as Haptics from 'expo-haptics';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  receives_notifications: boolean;
  notification_preferences: {
    check_in: boolean;
    check_out: boolean;
    daily_report: boolean;
  };
}

interface Props {
  contacts: Contact[];
  onUpdate: (contacts: Contact[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Sibling', 'Friend', 'Neighbor', 'Other'];

function PersonIcon({ size = 20, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function PlusIcon({ size = 24, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 20, color = '#EF4444' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EmergencyContactsStep({ contacts, onUpdate, onNext, onBack }: Props) {
  const addContact = () => {
    if (contacts.length >= 3) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newContact: Contact = {
      id: `temp-${Date.now()}`,
      name: '',
      relationship: '',
      phone: '',
      receives_notifications: true,
      notification_preferences: {
        check_in: true,
        check_out: true,
        daily_report: true,
      },
    };

    onUpdate([...contacts, newContact]);
  };

  const updateContact = (index: number, field: string, value: any) => {
    const updated = [...contacts];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      (updated[index] as any)[parent][child] = value;
    } else {
      (updated[index] as any)[field] = value;
    }
    onUpdate(updated);
  };

  const removeContact = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = contacts.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      let formatted = '';
      if (match[1]) formatted = `(${match[1]}`;
      if (match[2]) formatted += `) ${match[2]}`;
      if (match[3]) formatted += `-${match[3]}`;
      return formatted;
    }
    return text;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Family Contacts</Text>
      <Text style={styles.subtitle}>
        Add family members who will receive notifications about care visits. You can add up to 3
        contacts.
      </Text>

      {contacts.map((contact, index) => (
        <View key={contact.id} style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <PersonIcon />
            </View>
            <Text style={styles.cardTitle}>Contact {index + 1}</Text>
            <Pressable
              style={styles.removeButton}
              onPress={() => removeContact(index)}
              accessibilityLabel={`Remove contact ${index + 1}`}
            >
              <TrashIcon />
            </Pressable>
          </View>

          <LargeInput
            label="Full Name"
            value={contact.name}
            onChangeText={(text) => updateContact(index, 'name', text)}
            placeholder="John Smith"
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Relationship</Text>
          <View style={styles.relationshipGrid}>
            {RELATIONSHIPS.map((rel) => (
              <Pressable
                key={rel}
                style={[
                  styles.relationshipChip,
                  contact.relationship === rel && styles.relationshipChipActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateContact(index, 'relationship', rel);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: contact.relationship === rel }}
              >
                <Text
                  style={[
                    styles.relationshipText,
                    contact.relationship === rel && styles.relationshipTextActive,
                  ]}
                >
                  {rel}
                </Text>
              </Pressable>
            ))}
          </View>

          <LargeInput
            label="Phone Number"
            value={contact.phone}
            onChangeText={(text) => updateContact(index, 'phone', formatPhoneNumber(text))}
            placeholder="(555) 555-5555"
            keyboardType="phone-pad"
          />

          <View style={styles.notificationSection}>
            <Text style={styles.notificationTitle}>Push Notifications</Text>

            <View style={styles.notificationRow}>
              <Text style={styles.notificationLabel}>Check-in alerts</Text>
              <Switch
                value={contact.notification_preferences.check_in}
                onValueChange={(val) =>
                  updateContact(index, 'notification_preferences.check_in', val)
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={contact.notification_preferences.check_in ? '#3B82F6' : '#F3F4F6'}
              />
            </View>

            <View style={styles.notificationRow}>
              <Text style={styles.notificationLabel}>Check-out alerts</Text>
              <Switch
                value={contact.notification_preferences.check_out}
                onValueChange={(val) =>
                  updateContact(index, 'notification_preferences.check_out', val)
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={contact.notification_preferences.check_out ? '#3B82F6' : '#F3F4F6'}
              />
            </View>

            <View style={styles.notificationRow}>
              <Text style={styles.notificationLabel}>Daily report</Text>
              <Switch
                value={contact.notification_preferences.daily_report}
                onValueChange={(val) =>
                  updateContact(index, 'notification_preferences.daily_report', val)
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={contact.notification_preferences.daily_report ? '#3B82F6' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>
      ))}

      {contacts.length < 3 && (
        <Pressable
          style={styles.addButton}
          onPress={addContact}
          accessibilityRole="button"
          accessibilityLabel="Add family contact"
        >
          <PlusIcon />
          <Text style={styles.addButtonText}>Add Family Contact</Text>
        </Pressable>
      )}

      {contacts.length === 0 && (
        <View style={styles.emptyState}>
          <FamilyIcon size={48} color="#3B82F6" />
          <Text style={styles.emptyText}>No contacts added yet</Text>
          <Text style={styles.emptySubtext}>
            Family contacts will receive notifications about care visits
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={onBack} style={styles.backButton} />
        <Button title="Continue" onPress={onNext} style={styles.nextButton} />
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
    marginBottom: 24,
    lineHeight: 24,
  },
  contactCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  removeButton: {
    padding: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  relationshipChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  relationshipChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  relationshipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  relationshipTextActive: {
    color: '#FFFFFF',
  },
  notificationSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  notificationLabel: {
    fontSize: 15,
    color: '#4B5563',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
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
