import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QRInviteCard } from '@/components/ui/QRCode';
import { shareInvite, buildDeepLink } from '@/lib/invite';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import {
  CaregiverIcon,
  FamilyIcon,
  ElderIcon,
  PlusIcon,
  TrashIcon,
  AlertIcon,
} from '@/components/icons';

interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface Caregiver {
  name: string;
  phone: string;
}

interface Elder {
  name: string;
  phone: string;
}

interface CareGroup {
  invite_code: string;
  created_at: string;
}

export default function CareGroupScreen() {
  const { elderId } = useLocalSearchParams<{ elderId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elder, setElder] = useState<any>(null);
  const [careGroup, setCareGroup] = useState<CareGroup | null>(null);

  // Form state
  const [caregiver, setCaregiver] = useState<Caregiver>({
    name: '',
    phone: '',
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    {
      id: '1',
      name: '',
      phone: '',
      relationship: 'Family',
    },
  ]);

  const [elderMember, setElderMember] = useState<Elder>({
    name: '',
    phone: '',
  });

  const relationshipOptions = [
    'Spouse',
    'Child',
    'Grandchild',
    'Sibling',
    'Parent',
    'Friend',
    'Other',
  ];

  // Fetch elder details
  useEffect(() => {
    const fetchElder = async () => {
      if (!elderId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('elders')
          .select('*')
          .eq('id', elderId)
          .single();

        if (error) throw error;
        setElder(data);
      } catch (error) {
        console.error('Error fetching elder:', error);
        Alert.alert('Error', 'Failed to load elder details');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchElder();
  }, [elderId]);

  // Add family member
  const handleAddFamilyMember = () => {
    if (familyMembers.length < 3) {
      setFamilyMembers([
        ...familyMembers,
        {
          id: Date.now().toString(),
          name: '',
          phone: '',
          relationship: 'Family',
        },
      ]);
    }
  };

  // Remove family member
  const handleRemoveFamilyMember = (id: string) => {
    if (familyMembers.length > 1) {
      setFamilyMembers(familyMembers.filter((member) => member.id !== id));
    }
  };

  // Update family member
  const handleUpdateFamilyMember = (
    id: string,
    field: keyof FamilyMember,
    value: string
  ) => {
    setFamilyMembers(
      familyMembers.map((member) =>
        member.id === id ? { ...member, [field]: value } : member
      )
    );
  };

  // Validate form
  const isFormValid = () => {
    // Caregiver is required
    if (!caregiver.name.trim() || !caregiver.phone.trim()) {
      return false;
    }

    // At least one family member with name and phone
    const hasValidFamilyMember = familyMembers.some(
      (member) => member.name.trim() && member.phone.trim()
    );

    if (!hasValidFamilyMember) {
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleCreateCareGroup = async () => {
    if (!isFormValid()) {
      Alert.alert(
        'Validation Error',
        'Please fill in Caregiver name/phone and at least one Family Member'
      );
      return;
    }

    if (!user?.id || !elderId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    setSubmitting(true);

    try {
      const members = {
        caregiver: {
          name: caregiver.name.trim(),
          phone: caregiver.phone.trim(),
        },
        family_members: familyMembers
          .filter((member) => member.name.trim() && member.phone.trim())
          .map((member) => ({
            name: member.name.trim(),
            phone: member.phone.trim(),
            relationship: member.relationship,
          })),
        elder: elderMember.name.trim()
          ? {
              name: elderMember.name.trim(),
              phone: elderMember.phone.trim(),
            }
          : null,
      };

      const { data, error } = await supabase.functions.invoke(
        'create-care-group',
        {
          body: {
            elder_id: elderId,
            created_by: user.id,
            members,
          },
        }
      );

      if (error) throw error;

      setCareGroup(data as CareGroup);
    } catch (error) {
      console.error('Error creating care group:', error);
      Alert.alert('Error', 'Failed to create care group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle share invite
  const handleShareInvite = async () => {
    if (!careGroup?.invite_code) {
      Alert.alert('Error', 'Missing invite code');
      return;
    }

    try {
      await shareInvite({
        inviteCode: careGroup.invite_code,
        elderName: elder?.first_name ? `${elder.first_name} ${elder.last_name || ''}`.trim() : 'the elder',
      });
    } catch (error) {
      console.error('Error sharing invite:', error);
      Alert.alert('Error', 'Failed to share invite');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // Success state: Show QR code and invite details
  if (careGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Care Group Created!</Text>
            <Text style={styles.successSubtitle}>
              Share this invite with family members and caregivers
            </Text>

            {/* QR Code Card */}
            <View style={styles.qrSection}>
              <QRInviteCard
                inviteCode={careGroup.invite_code}
                elderName={elder?.first_name ? `${elder.first_name} ${elder.last_name || ''}`.trim() : 'Elder'}
                deepLink={buildDeepLink(careGroup.invite_code)}
                onShare={handleShareInvite}
              />
            </View>

            {/* Invite Code Display */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Invite Code</Text>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeText}>{careGroup.invite_code}</Text>
              </View>
            </View>

            {/* Back Button */}
            <Button
              title="Back to Dashboard"
              onPress={() => router.back()}
              variant="secondary"
              style={styles.backButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Form state: Creating care group
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Care Group</Text>
          <Text style={styles.subtitle}>
            Set up care team for {elder?.first_name} {elder?.last_name}
          </Text>
        </View>

        {/* Caregiver Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CaregiverIcon size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Primary Caregiver</Text>
          </View>
          <Text style={styles.sectionDescription}>Required</Text>

          <Input
            placeholder="Caregiver Name"
            value={caregiver.name}
            onChangeText={(text) =>
              setCaregiver({ ...caregiver, name: text })
            }
            editable={!submitting}
            style={styles.input}
          />

          <Input
            placeholder="Phone Number"
            value={caregiver.phone}
            onChangeText={(text) =>
              setCaregiver({ ...caregiver, phone: text })
            }
            keyboardType="phone-pad"
            editable={!submitting}
            style={styles.input}
          />

          <View style={styles.consentNote}>
            <AlertIcon size={16} color={colors.info[500]} />
            <Text style={styles.consentNoteText}>
              The caregiver will receive a notification and must accept before joining this care group.
            </Text>
          </View>
        </View>

        {/* Family Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FamilyIcon size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Family Members</Text>
          </View>
          <Text style={styles.sectionDescription}>
            At least one required (up to 3)
          </Text>

          {familyMembers.map((member, index) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberIndex}>Member {index + 1}</Text>
                {familyMembers.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveFamilyMember(member.id)}
                    disabled={submitting}
                  >
                    <TrashIcon size={20} color={colors.error[500]} />
                  </TouchableOpacity>
                )}
              </View>

              <Input
                placeholder="Full Name"
                value={member.name}
                onChangeText={(text) =>
                  handleUpdateFamilyMember(member.id, 'name', text)
                }
                editable={!submitting}
                style={styles.input}
              />

              <Input
                placeholder="Phone Number"
                value={member.phone}
                onChangeText={(text) =>
                  handleUpdateFamilyMember(member.id, 'phone', text)
                }
                keyboardType="phone-pad"
                editable={!submitting}
                style={styles.input}
              />

              {/* Relationship Dropdown */}
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>Relationship</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.relationshipScroll}
                >
                  {relationshipOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() =>
                        handleUpdateFamilyMember(member.id, 'relationship', option)
                      }
                      disabled={submitting}
                      style={[
                        styles.relationshipChip,
                        member.relationship === option &&
                          styles.relationshipChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.relationshipChipText,
                          member.relationship === option &&
                            styles.relationshipChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ))}

          {/* Add Family Member Button */}
          <TouchableOpacity
            onPress={handleAddFamilyMember}
            disabled={familyMembers.length >= 3 || submitting}
            style={[
              styles.addButton,
              (familyMembers.length >= 3 || submitting) &&
                styles.addButtonDisabled,
            ]}
          >
            <PlusIcon
              size={20}
              color={
                familyMembers.length >= 3 ? colors.text.secondary : colors.primary[500]
              }
            />
            <Text
              style={[
                styles.addButtonText,
                familyMembers.length >= 3 && styles.addButtonTextDisabled,
              ]}
            >
              Add Family Member
            </Text>
          </TouchableOpacity>
        </View>

        {/* Elder Section (Optional) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ElderIcon size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Elder Details (Optional)</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Auto-filled for verification
          </Text>

          <Input
            placeholder="Elder Name"
            value={elderMember.name}
            onChangeText={(text) =>
              setElderMember({ ...elderMember, name: text })
            }
            editable={!submitting}
            style={styles.input}
          />

          <Input
            placeholder="Elder Phone (Optional)"
            value={elderMember.phone}
            onChangeText={(text) =>
              setElderMember({ ...elderMember, phone: text })
            }
            keyboardType="phone-pad"
            editable={!submitting}
            style={styles.input}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.buttonGroup}>
          <Button
            title={submitting ? 'Creating Care Group...' : 'Create Care Group'}
            onPress={handleCreateCareGroup}
            disabled={submitting || !isFormValid()}
            loading={submitting}
            style={styles.submitButton}
          />

          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            disabled={submitting}
            style={styles.cancelButton}
          />
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
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Success State Styles
  successContainer: {
    flex: 1,
  },
  successTitle: {
    ...typography.styles.h1,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  successSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[8],
  },
  qrSection: {
    marginVertical: spacing[8],
    alignItems: 'center',
  },
  codeContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: spacing[5],
    marginVertical: spacing[5],
  },
  codeLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  codeDisplay: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 6,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  codeText: {
    ...typography.styles.h2,
    color: colors.primary[500],
    textAlign: 'center',
    letterSpacing: 2,
  },
  shareButton: {
    marginVertical: spacing[3],
  },
  shareIcon: {
    fontSize: 18,
    marginRight: spacing[2],
  },
  backButton: {
    marginTop: spacing[3],
  },

  // Form State Styles
  header: {
    marginBottom: spacing[8],
  },
  title: {
    ...typography.styles.h1,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },

  // Section Styles
  section: {
    marginBottom: spacing[8],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  sectionDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },

  // Input Styles
  input: {
    marginBottom: spacing[3],
  },

  // Member Card Styles
  memberCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: spacing[5],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  memberIndex: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },

  // Dropdown/Relationship Styles
  dropdownContainer: {
    marginBottom: spacing[3],
  },
  dropdownLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  relationshipScroll: {
    marginHorizontal: -spacing[5],
    paddingHorizontal: spacing[5],
  },
  relationshipChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: spacing[2],
  },
  relationshipChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  relationshipChipText: {
    ...typography.styles.caption,
    color: colors.text.primary,
    fontWeight: '500',
  },
  relationshipChipTextActive: {
    color: colors.white,
  },

  // Add Button Styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    borderColor: colors.neutral[200],
    backgroundColor: colors.background,
  },
  addButtonText: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.primary[500],
    marginLeft: spacing[2],
  },
  addButtonTextDisabled: {
    color: colors.text.secondary,
  },

  // Button Group Styles
  buttonGroup: {
    marginTop: spacing[8],
    marginBottom: spacing[5],
  },
  submitButton: {
    marginBottom: spacing[3],
  },
  cancelButton: {
    marginBottom: spacing[3],
  },
  consentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.info[50],
    padding: spacing[3],
    borderRadius: 8,
    marginTop: spacing[3],
  },
  consentNoteText: {
    ...typography.styles.bodySmall,
    color: colors.info[700],
    flex: 1,
  },
});
