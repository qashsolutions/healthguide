// HealthGuide Caregiver Profile View
// Read-only profile for agency owners to view caregiver details

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Linking,
  Image,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  ChevronLeftIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MessageIcon,
} from '@/components/icons';
import { RatingModal } from '@/components/caregiver/RatingModal';
import { RatingSummary } from '@/components/caregiver/RatingSummary';
import { ReviewsList } from '@/components/caregiver/ReviewsList';

interface CaregiverProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  zip_code: string;
  hourly_rate?: number;
  npi_verified: boolean;
  npi_credentials?: string;
  npi_specialty?: string;
  certifications?: string;
  bio?: string;
  experience_summary?: string;
  capabilities: string[];
  availability: Record<string, boolean[]>; // e.g., { "Mon": [true, false, true], ... }
  rating_count?: number;
  positive_count?: number;
}

export default function CaregiverProfileViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReviewsList, setShowReviewsList] = useState(false);

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDaysOfWeek = () => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const getTimeSlots = () => ['Morning', 'Afternoon', 'Evening'];

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
                {getInitials(profile.first_name, profile.last_name)}
              </Text>
            </View>
          )}

          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>
                {profile.first_name} {profile.last_name}
              </Text>
            </View>

            {profile.npi_verified ? (
              <View style={styles.verifiedBadge}>
                <ShieldCheckIcon size={16} color={colors.success[500]} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <Text style={styles.unverifiedText}>Unverified</Text>
            )}

            {profile.npi_verified && profile.npi_credentials && (
              <Text style={styles.credentialsText}>{profile.npi_credentials}</Text>
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
              {profile.hourly_rate ? `$${profile.hourly_rate}/hr` : 'Rate not specified'}
            </Text>
          </View>

          {/* Certifications */}
          {profile.certifications && (
            <View style={styles.professionalItem}>
              <Text style={styles.label}>Certifications</Text>
              <Text style={styles.value}>{profile.certifications}</Text>
            </View>
          )}

          {/* NPI Specialty */}
          {profile.npi_verified && profile.npi_specialty && (
            <View style={styles.professionalItem}>
              <Text style={styles.label}>Specialty</Text>
              <Text style={styles.value}>{profile.npi_specialty}</Text>
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
          <View style={styles.availabilityGrid}>
            {/* Time slot headers */}
            <View style={styles.availabilityRow}>
              <View style={styles.dayCell} />
              {getTimeSlots().map((slot) => (
                <View key={slot} style={styles.slotHeaderCell}>
                  <Text style={styles.slotHeaderText}>{slot.substring(0, 3)}</Text>
                </View>
              ))}
            </View>

            {/* Days */}
            {getDaysOfWeek().map((day, dayIndex) => (
              <View key={day} style={styles.availabilityRow}>
                <View style={styles.dayCell}>
                  <Text style={styles.dayText}>{day.substring(0, 3)}</Text>
                </View>
                {getTimeSlots().map((slot, slotIndex) => {
                  const isAvailable = profile.availability?.[day.toLowerCase()]?.[slotIndex] ?? false;
                  return (
                    <View
                      key={`${day}-${slot}`}
                      style={[
                        styles.availabilityCell,
                        isAvailable && styles.availabilityCellActive,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>

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
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        caregiverProfileId={profile.id}
        caregiverName={`${profile.first_name} ${profile.last_name}`}
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
        caregiverName={`${profile.first_name} ${profile.last_name}`}
        isVisible={showReviewsList}
        onClose={() => setShowReviewsList(false)}
      />
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
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.success[50],
    marginBottom: spacing[1],
  },
  verifiedText: {
    ...typography.styles.caption,
    color: colors.success[600],
    fontWeight: '600',
  },
  unverifiedText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
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
  availabilityGrid: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  availabilityRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  availabilityRow: {
    flexDirection: 'row',
  },
  dayCell: {
    width: 60,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  dayText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 11,
  },
  slotHeaderCell: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  slotHeaderText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 10,
  },
  availabilityCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.neutral[100],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  availabilityCellActive: {
    backgroundColor: colors.success[600],
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
});
