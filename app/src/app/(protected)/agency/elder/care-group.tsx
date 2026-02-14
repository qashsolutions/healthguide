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
    if (!careGroup?.invite_code || !elderId) {
      Alert.alert('Error', 'Missing invite code');
      return;
    }

    try {
      const deepLink = buildDeepLink('care-group-invite', {
        code: careGroup.invite_code,
        elderId,
      });

      await shareInvite({
        inviteCode: careGroup.invite_code,
        deepLink,
        elderName: elder?.full_name || 'the elder',
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
          <ActivityIndicator size="large" color={colors.primary} />
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
                code={careGroup.invite_code}
                elderName={elder?.full_name || 'Elder'}
                deepLink={buildDeepLink('care-group-invite', {
                  code: careGroup.invite_code,
                  elderId,
                })}
              />
            </View>

            {/* Invite Code Display */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Invite Code</Text>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeText}>{careGroup.invite_code}</Text>
              </View>
            </View>

            {/* Share Button */}
            <Button
              label="Share Invite"
              onPress={handleShareInvite}
              style={styles.shareButton}
              icon={<Text style={styles.shareIcon}>↗</Text>}
            />

            {/* Back Button */}
            <Button
              label="Back to Dashboard"
              onPress={() => router.push('/agency/dashboard')}
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
            Set up care team for {elder?.full_name}
          </Text>
        </View>

        {/* Caregiver Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CaregiverIcon size={20} color={colors.primary} />
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
            <FamilyIcon size={20} color={colors.primary} />
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
                    <TrashIcon size={20} color={colors.danger} />
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
                familyMembers.length >= 3 ? colors.textSecondary : colors.primary
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
            <ElderIcon size={20} color={colors.primary} />
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
            label={submitting ? 'Creating Care Group...' : 'Create Care Group'}
            onPress={handleCreateCareGroup}
            disabled={submitting || !isFormValid()}
            loading={submitting}
            style={styles.submitButton}
          />

          <Button
            label="Cancel"
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    fontSize: typography.sizes.heading1,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  qrSection: {
    marginVertical: spacing.xl,
    alignItems: 'center',
  },
  codeContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  codeLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  codeDisplay: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  codeText: {
    fontSize: typography.sizes.heading2,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  shareButton: {
    marginVertical: spacing.md,
  },
  shareIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  backButton: {
    marginTop: spacing.md,
  },

  // Form State Styles
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.heading1,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },

  // Section Styles
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.subheading,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Input Styles
  input: {
    marginBottom: spacing.md,
  },

  // Member Card Styles
  memberCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  memberIndex: {
    fontSize: typography.sizes.subheading,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },

  // Dropdown/Relationship Styles
  dropdownContainer: {
    marginBottom: spacing.md,
  },
  dropdownLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  relationshipScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  relationshipChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  relationshipChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  relationshipChipText: {
    fontSize: typography.sizes.caption,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  relationshipChipTextActive: {
    color: colors.textOnPrimary,
  },

  // Add Button Styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  addButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  addButtonTextDisabled: {
    color: colors.textSecondary,
  },

  // Button Group Styles
  buttonGroup: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    marginBottom: spacing.md,
  },
  consentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.info[50],
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  consentNoteText: {
    fontSize: typography.sizes.sm,
    color: colors.info[700],
    flex: 1,
  },
});
