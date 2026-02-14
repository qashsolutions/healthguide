// HealthGuide Careseeker Onboarding - Review Step
// Final review before submission

import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Button } from '@/components/ui/Button';

interface Props {
  formData: {
    personal: {
      first_name: string;
      last_name: string;
      date_of_birth: string;
      phone: string;
      photo_url: string | null;
    };
    address: {
      address: string;
      apartment: string;
      city: string;
      state: string;
      zip_code: string;
      latitude: number;
      longitude: number;
    };
    contacts: any[];
    tasks: any[];
    notes: {
      medical_notes: string;
      special_instructions: string;
    };
  };
  onSubmit: () => void;
  onBack: () => void;
  submitting?: boolean;
}

function PersonIcon({ size = 24, color = '#3B82F6' }) {
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

function HomeIcon({ size = 24, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UsersIcon({ size = 24, color = '#F59E0B' }) {
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

function TaskIcon({ size = 24, color = '#8B5CF6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 11l3 3L22 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ReviewStep({ formData, onSubmit, onBack, submitting }: Props) {
  const { personal, address, contacts, tasks } = formData;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review & Confirm</Text>
      <Text style={styles.subtitle}>Please review the information before adding this elder</Text>

      {/* Personal Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#EFF6FF' }]}>
            <PersonIcon />
          </View>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        <View style={styles.sectionContent}>
          {personal.photo_url && (
            <Image source={{ uri: personal.photo_url }} style={styles.profilePhoto} />
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>
              {personal.first_name} {personal.last_name}
            </Text>
          </View>
          {personal.date_of_birth && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{personal.date_of_birth}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{personal.phone}</Text>
          </View>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
            <HomeIcon />
          </View>
          <Text style={styles.sectionTitle}>Home Address</Text>
          {address.latitude !== 0 && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified ✓</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionContent}>
          <Text style={styles.addressText}>
            {address.address}
            {address.apartment ? `, ${address.apartment}` : ''}
          </Text>
          <Text style={styles.addressText}>
            {address.city}, {address.state} {address.zip_code}
          </Text>
        </View>
      </View>

      {/* Family Contacts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
            <UsersIcon />
          </View>
          <Text style={styles.sectionTitle}>Family Contacts</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{contacts.length}</Text>
          </View>
        </View>

        <View style={styles.sectionContent}>
          {contacts.length === 0 ? (
            <Text style={styles.emptyText}>No family contacts added</Text>
          ) : (
            contacts.map((contact, index) => (
              <View key={contact.id || index} style={styles.contactItem}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDetails}>
                  {contact.relationship} • {contact.phone}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Care Tasks Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
            <TaskIcon />
          </View>
          <Text style={styles.sectionTitle}>Care Tasks</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{tasks.length}</Text>
          </View>
        </View>

        <View style={styles.sectionContent}>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks selected</Text>
          ) : (
            <Text style={styles.tasksCount}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} will be assigned
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={onBack} style={styles.backButton} />
        <Button
          title={submitting ? 'Adding Elder...' : 'Add Elder'}
          onPress={onSubmit}
          disabled={submitting}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionContent: {
    padding: 16,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  addressText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  contactItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  contactDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  tasksCount: {
    fontSize: 15,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
