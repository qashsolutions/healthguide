// HealthGuide Caregiver Profile View
// Read-only profile for agency owners to view caregiver details

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Image,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronLeftIcon,
  PhoneIcon,
  MessageIcon,
  AlertIcon,
  CloseIcon,
} from '@/components/icons';
import { RatingModal } from '@/components/caregiver/RatingModal';
import { RatingSummary } from '@/components/caregiver/RatingSummary';
import { ReviewsList } from '@/components/caregiver/ReviewsList';

interface WorkHistoryEntry {
  title: string;
  employer: string;
  location: string;
  start_date: string;
  end_date: string;
}

interface EducationEntry {
  institution: string;
  location: string;
  start_date: string;
  end_date: string;
}

interface ReferenceEntry {
  name: string;
  phone: string;
  relationship: string;
}

interface CaregiverProfile {
  id: string;
  user_id: string;
  full_name: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  zip_code: string;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  certifications?: string[] | string;
  bio?: string;
  experience_summary?: string;
  capabilities: string[];
  keywords?: string[];
  availability: Record<string, string[]>;
  rating_count?: number;
  positive_count?: number;
  work_history?: WorkHistoryEntry[];
  education?: EducationEntry[];
  caregiver_references?: ReferenceEntry[];
}

const REPORT_REASONS = [
  'Misleading or false profile information',
  'Inappropriate behavior',
  'Suspected fraud or scam',
  'Safety concern',
  'Other',
];

export default function CaregiverProfileViewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReviewsList, setShowReviewsList] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error fetching caregiver profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (profile?.phone) {
      Linking.openURL(`tel:${profile.phone}`).catch((err) =>
        console.error('Error opening phone:', err)
      );
    }
  };

  const handleText = () => {
    if (profile?.phone) {
      Linking.openURL(`sms:${profile.phone}`).catch((err) =>
        console.error('Error opening SMS:', err)
      );
    }
  };

  const getInitials = (fullName: string) => {
    const parts = (fullName || '').trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const handleSubmitReport = async () => {
    if (!selectedReason || !profile) return;
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from('caregiver_reports').insert({
        caregiver_profile_id: profile.id,
        reported_by: user?.id,
        reason: selectedReason,
      });
      if (error) throw error;
      setShowReportModal(false);
      setSelectedReason(null);
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting. Our team will review this caregiver profile.'
      );
    } catch (err) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', 'Could not submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const getDaysOfWeek = () => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /** Map raw slot values to readable labels */
  const slotLabelMap: Record<string, string> = {
    '6am-8am': '6–8a',
    '8am-10am': '8–10a',
    '10am-12pm': '10–12p',
    '12pm-2pm': '12–2p',
    '2pm-4pm': '2–4p',
    '4pm-6pm': '4–6p',
    '6pm-8pm': '6–8p',
    '8pm-10pm': '8–10p',
    '10pm-6am': 'Overnight',
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={roleColors.agency_owner} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeftIcon size={28} color={colors.text.primary} />
        </Pressable>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeftIcon size={28} color={colors.text.primary} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          {profile.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.largeAvatar} />
          ) : (
            <View style={styles.largeAvatarPlaceholder}>
              <Text style={styles.largeAvatarText}>
                {getInitials(profile.full_name)}
              </Text>
            </View>
          )}

          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>
                {profile.full_name}
              </Text>
            </View>

            {profile.certifications && (
              <Text style={styles.credentialsText}>
                {Array.isArray(profile.certifications) ? profile.certifications.join(', ') : profile.certifications}
              </Text>
            )}
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact</Text>
          {profile.phone && (
            <View style={styles.contactInfo}>
              <Text style={styles.phoneText}>{profile.phone}</Text>
              <View style={styles.contactButtonsRow}>
                <Pressable style={styles.contactButton} onPress={handleCall}>
                  <PhoneIcon size={18} color={colors.white} />
                  <Text style={styles.contactButtonText}>Call</Text>
                </Pressable>
                <Pressable style={styles.contactButton} onPress={handleText}>
                  <MessageIcon size={18} color={colors.white} />
                  <Text style={styles.contactButtonText}>Text</Text>
                </Pressable>
              </View>
            </View>
          )}
          {!profile.phone && (
            <Text style={styles.placeholderText}>Phone number not available</Text>
          )}
        </View>

        {/* Professional Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Professional</Text>

          {/* Rate */}
          <View style={styles.professionalItem}>
            <Text style={styles.rateValue}>
              {profile.hourly_rate_min && profile.hourly_rate_max
                ? `$${profile.hourly_rate_min}-$${profile.hourly_rate_max}/hr`
                : profile.hourly_rate_min
                  ? `From $${profile.hourly_rate_min}/hr`
                  : 'Rate not specified'}
            </Text>
          </View>

          {/* Certifications */}
          {profile.certifications && (
            <View style={styles.professionalItem}>
              <Text style={styles.label}>Certifications</Text>
              <Text style={styles.value}>
                {Array.isArray(profile.certifications) ? profile.certifications.join(', ') : profile.certifications}
              </Text>
            </View>
          )}

        </View>

        {/* Skills Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Skills</Text>
          {profile.capabilities && profile.capabilities.length > 0 ? (
            <View style={styles.capabilitiesGrid}>
              {profile.capabilities.map((capability, index) => (
                <View key={index} style={styles.capabilityChip}>
                  <Text style={styles.capabilityChipText}>{capability}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.placeholderText}>No capabilities listed</Text>
          )}

          {/* Due diligence disclaimer */}
          <View style={styles.disclaimerBanner}>
            <AlertIcon size={16} color={colors.warning[600]} />
            <Text style={styles.disclaimerText}>
              Skills and certifications listed here are self-reported and have not been verified by HealthGuide. Please conduct your own due diligence before assigning care.
            </Text>
          </View>
        </View>

        {/* Ratings Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <RatingSummary
            caregiverProfileId={profile.id}
            ratingCount={profile.rating_count}
            positiveCount={profile.positive_count}
            mode="full"
            onViewReviews={() => setShowReviewsList(true)}
          />
          <Pressable
            style={styles.rateButton}
            onPress={() => setShowRatingModal(true)}
          >
            <Text style={styles.rateButtonText}>Rate This Caregiver</Text>
          </Pressable>
        </View>

        {/* Availability Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Availability</Text>
          {getDaysOfWeek().every(
            (day) => !(profile.availability?.[day.toLowerCase()]?.length)
          ) ? (
            <Text style={styles.placeholderText}>No availability set</Text>
          ) : (
            <View style={styles.availDaysList}>
              {getDaysOfWeek().map((day) => {
                const daySlots = profile.availability?.[day.toLowerCase()] || [];
                const slots = Array.isArray(daySlots) ? daySlots.filter(Boolean) : [];
                if (slots.length === 0) return null;
                return (
                  <View key={day} style={styles.availDayRow}>
                    <Text style={styles.availDayLabel}>{day.substring(0, 3)}</Text>
                    <View style={styles.availSlotChips}>
                      {slots.map((slot) => (
                        <View key={slot} style={styles.availSlotChip}>
                          <Text style={styles.availSlotChipText}>
                            {slotLabelMap[slot] || slot}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Experience & Education Section */}
        {((profile.work_history && profile.work_history.length > 0) ||
          (profile.education && profile.education.length > 0)) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Experience & Education</Text>
            <View style={styles.timelineDivider} />

            {/* Work History */}
            {profile.work_history?.map((job, index) => (
              <View key={`work-${index}`} style={styles.timelineEntry}>
                <View style={styles.timelineIconContainer}>
                  <View style={[styles.timelineIcon, { backgroundColor: colors.primary[50] }]}>
                    <Text style={[styles.timelineIconText, { color: colors.primary[600] }]}>W</Text>
                  </View>
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTitleRow}>
                    <Text style={styles.timelineTitle}>{job.title}</Text>
                    <Text style={styles.timelineDates}>{job.start_date} – {job.end_date}</Text>
                  </View>
                  <Text style={styles.timelineSubtitle}>{job.employer}</Text>
                  <Text style={styles.timelineLocation}>{job.location}</Text>
                </View>
              </View>
            ))}

            {/* Education */}
            {profile.education?.map((edu, index) => (
              <View key={`edu-${index}`} style={styles.timelineEntry}>
                <View style={styles.timelineIconContainer}>
                  <View style={[styles.timelineIcon, { backgroundColor: colors.warning[50] }]}>
                    <Text style={[styles.timelineIconText, { color: colors.warning[600] }]}>E</Text>
                  </View>
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTitleRow}>
                    <Text style={styles.timelineTitle}>{edu.institution}</Text>
                    <Text style={styles.timelineDates}>{edu.start_date} – {edu.end_date}</Text>
                  </View>
                  <Text style={styles.timelineLocation}>{edu.location}</Text>
                </View>
              </View>
            ))}

            <View style={styles.disclaimerBanner}>
              <AlertIcon size={14} color={colors.warning[600]} />
              <Text style={styles.disclaimerText}>
                Work history and education are self-reported and have not been verified.
              </Text>
            </View>
          </View>
        )}

        {/* References Section */}
        {profile.caregiver_references && profile.caregiver_references.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>References</Text>
            {profile.caregiver_references.map((ref, index) => (
              <View key={`ref-${index}`} style={[styles.referenceEntry, index > 0 && styles.referenceEntryBorder]}>
                <View style={styles.referenceInfo}>
                  <Text style={styles.referenceName}>{ref.name}</Text>
                  <Text style={styles.referenceRelationship}>{ref.relationship}</Text>
                </View>
                <Pressable
                  style={styles.referenceCallButton}
                  onPress={() => Linking.openURL(`tel:${ref.phone}`).catch(() => {})}
                >
                  <PhoneIcon size={14} color={colors.white} />
                  <Text style={styles.referenceCallText}>{ref.phone}</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.disclaimerBanner}>
              <AlertIcon size={14} color={colors.warning[600]} />
              <Text style={styles.disclaimerText}>
                References are provided by the caregiver and have not been contacted or verified by HealthGuide.
              </Text>
            </View>
          </View>
        )}

        {/* Keywords Section */}
        {profile.keywords && profile.keywords.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Keywords</Text>
            <View style={styles.capabilitiesGrid}>
              {profile.keywords.map((keyword, index) => (
                <View key={index} style={[styles.capabilityChip, { backgroundColor: colors.info[50], borderColor: colors.info[600] }]}>
                  <Text style={[styles.capabilityChipText, { color: colors.info[600] }]}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* About Section */}
        {(profile.experience_summary || profile.bio) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About</Text>

            {profile.experience_summary && (
              <View style={styles.aboutItem}>
                <Text style={styles.label}>Experience</Text>
                <Text style={styles.value}>{profile.experience_summary}</Text>
              </View>
            )}

            {profile.bio && (
              <View style={styles.aboutItem}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.value}>{profile.bio}</Text>
              </View>
            )}
          </View>
        )}

        {/* Report / Flag Caregiver */}
        <Pressable
          style={styles.reportButton}
          onPress={() => setShowReportModal(true)}
        >
          <AlertIcon size={16} color={colors.error[600]} />
          <Text style={styles.reportButtonText}>Report / Flag This Caregiver</Text>
        </Pressable>
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        caregiverProfileId={profile.id}
        caregiverName={profile.full_name}
        isVisible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSuccess={() => {
          // Refresh profile to get updated rating counts
          fetchProfile();
        }}
      />

      {/* Reviews List Modal */}
      <ReviewsList
        caregiverProfileId={profile.id}
        caregiverName={profile.full_name}
        isVisible={showReviewsList}
        onClose={() => setShowReviewsList(false)}
      />

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Report Caregiver</Text>
              <Pressable onPress={() => { setShowReportModal(false); setSelectedReason(null); }}>
                <CloseIcon size={24} color={colors.text.secondary} />
              </Pressable>
            </View>

            <Text style={styles.reportSubtitle}>
              Why are you reporting {profile.full_name}?
            </Text>

            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={[
                  styles.reportReasonRow,
                  selectedReason === reason && styles.reportReasonRowSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={[
                  styles.reportRadio,
                  selectedReason === reason && styles.reportRadioSelected,
                ]}>
                  {selectedReason === reason && <View style={styles.reportRadioDot} />}
                </View>
                <Text style={[
                  styles.reportReasonText,
                  selectedReason === reason && styles.reportReasonTextSelected,
                ]}>
                  {reason}
                </Text>
              </Pressable>
            ))}

            <View style={styles.reportDisclaimer}>
              <AlertIcon size={14} color={colors.warning[600]} />
              <Text style={styles.reportDisclaimerText}>
                Reports are reviewed by our team. Abuse of the report system may result in account restrictions.
              </Text>
            </View>

            <Pressable
              style={[
                styles.reportSubmitButton,
                !selectedReason && styles.reportSubmitButtonDisabled,
              ]}
              onPress={selectedReason ? handleSubmitReport : undefined}
              disabled={!selectedReason || reportSubmitting}
            >
              <Text style={[
                styles.reportSubmitText,
                !selectedReason && styles.reportSubmitTextDisabled,
              ]}>
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  errorText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
    paddingVertical: spacing[4],
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing[3],
  },
  largeAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: roleColors.caregiver,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  largeAvatarText: {
    ...typography.styles.h2,
    color: colors.white,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
  },
  nameRow: {
    marginBottom: spacing[2],
  },
  fullName: {
    ...typography.styles.h2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  credentialsText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  contactInfo: {
    gap: spacing[3],
  },
  phoneText: {
    ...typography.styles.bodyLarge,
    color: colors.text.primary,
    fontWeight: '500',
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success[600],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  contactButtonText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
  placeholderText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  professionalItem: {
    marginBottom: spacing[3],
  },
  rateValue: {
    ...typography.styles.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  label: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  value: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  capabilityChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[600],
  },
  capabilityChipText: {
    ...typography.styles.caption,
    color: colors.success[600],
    fontWeight: '600',
  },
  availDaysList: {
    gap: spacing[2],
  },
  availDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  availDayLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
    width: 44,
  },
  availSlotChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  availSlotChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[300],
  },
  availSlotChipText: {
    ...typography.styles.caption,
    color: colors.success[700],
    fontWeight: '600',
    fontSize: 12,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.warning[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  disclaimerText: {
    ...typography.styles.caption,
    color: colors.warning[700],
    flex: 1,
    lineHeight: 18,
  },
  aboutItem: {
    marginBottom: spacing[3],
  },
  rateButton: {
    marginTop: spacing[3],
    backgroundColor: colors.success[600],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },

  // Timeline (Experience & Education)
  timelineDivider: {
    height: 2,
    backgroundColor: colors.neutral[200],
    marginBottom: spacing[4],
  },
  timelineEntry: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  timelineIconContainer: {
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: 2,
  },
  timelineTitle: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  timelineDates: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    flexShrink: 0,
  },
  timelineSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 1,
  },
  timelineLocation: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },

  // References
  referenceEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  referenceEntryBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  referenceInfo: {
    flex: 1,
  },
  referenceName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  referenceRelationship: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  referenceCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.success[600],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  referenceCallText: {
    ...typography.styles.caption,
    color: colors.white,
    fontWeight: '600',
  },

  // Report button
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
    marginBottom: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error[200],
    backgroundColor: colors.error[50],
  },
  reportButtonText: {
    ...typography.styles.caption,
    color: colors.error[600],
    fontWeight: '600',
  },

  // Report modal
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  reportModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  reportTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  reportSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  reportReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[1],
  },
  reportReasonRowSelected: {
    backgroundColor: colors.error[50],
  },
  reportRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportRadioSelected: {
    borderColor: colors.error[600],
  },
  reportRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error[600],
  },
  reportReasonText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  reportReasonTextSelected: {
    color: colors.error[700],
    fontWeight: '500',
  },
  reportDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  reportDisclaimerText: {
    ...typography.styles.caption,
    color: colors.warning[700],
    flex: 1,
    lineHeight: 18,
  },
  reportSubmitButton: {
    backgroundColor: colors.error[600],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  reportSubmitButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  reportSubmitText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
  reportSubmitTextDisabled: {
    color: colors.text.tertiary,
  },
});
