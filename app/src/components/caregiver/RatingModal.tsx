/**
 * RatingModal — Caregiver rating submission component
 *
 * Thumbs up/down + selectable tags + optional comment (max 200 chars).
 * Uses UPSERT for one-rating-per-user enforcement.
 * Emerald (#059669) accent theme.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ThumbsUpIcon, ThumbsDownIcon } from '@/components/icons';

const AVAILABLE_TAGS = [
  'reliable',
  'compassionate',
  'skilled',
  'punctual',
  'professional',
  'communicative',
] as const;

type RatingTag = (typeof AVAILABLE_TAGS)[number];

const TAG_LABELS: Record<RatingTag, string> = {
  reliable: 'Reliable',
  compassionate: 'Compassionate',
  skilled: 'Skilled',
  punctual: 'Punctual',
  professional: 'Professional',
  communicative: 'Communicative',
};

interface Props {
  caregiverProfileId: string;
  caregiverName: string;
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RatingModal({
  caregiverProfileId,
  caregiverName,
  isVisible,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<RatingTag[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing rating if user has already rated this caregiver
  useEffect(() => {
    if (isVisible && user) {
      loadExistingRating();
    }
  }, [isVisible, user]);

  async function loadExistingRating() {
    if (!user) return;
    setLoadingExisting(true);

    const { data } = await supabase
      .from('caregiver_ratings')
      .select('is_positive, tags, comment')
      .eq('caregiver_profile_id', caregiverProfileId)
      .eq('reviewer_user_id', user.id)
      .maybeSingle();

    if (data) {
      setIsPositive(data.is_positive);
      setSelectedTags((data.tags || []) as RatingTag[]);
      setComment(data.comment || '');
    } else {
      // Reset form for new rating
      setIsPositive(null);
      setSelectedTags([]);
      setComment('');
    }
    setLoadingExisting(false);
  }

  function toggleTag(tag: RatingTag) {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (isPositive === null) {
      Alert.alert('Required', 'Please select thumbs up or thumbs down.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to rate a caregiver.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('caregiver_ratings')
        .upsert(
          {
            caregiver_profile_id: caregiverProfileId,
            reviewer_user_id: user.id,
            is_positive: isPositive,
            tags: selectedTags,
            comment: comment.trim() || null,
          },
          { onConflict: 'caregiver_profile_id,reviewer_user_id' }
        );

      if (error) {
        if (error.message.includes('cannot rate themselves')) {
          Alert.alert('Not Allowed', 'You cannot rate your own profile.');
        } else {
          Alert.alert('Error', 'Could not submit rating. Please try again.');
        }
        return;
      }

      onSuccess();
      onClose();
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={16}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Rate Caregiver</Text>
          <View style={{ width: 60 }} />
        </View>

        {loadingExisting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Caregiver name */}
            <Text style={styles.caregiverName}>{caregiverName}</Text>

            {/* Thumbs up/down */}
            <Text style={styles.sectionLabel}>How was your experience?</Text>
            <View style={styles.thumbsRow}>
              <Pressable
                style={[
                  styles.thumbButton,
                  isPositive === true && styles.thumbButtonActiveUp,
                ]}
                onPress={() => setIsPositive(true)}
              >
                <ThumbsUpIcon size={32} color={isPositive === true ? '#059669' : '#6B7280'} />
                <Text
                  style={[
                    styles.thumbLabel,
                    isPositive === true && styles.thumbLabelActive,
                  ]}
                >
                  Positive
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.thumbButton,
                  isPositive === false && styles.thumbButtonActiveDown,
                ]}
                onPress={() => setIsPositive(false)}
              >
                <ThumbsDownIcon size={32} color={isPositive === false ? '#DC2626' : '#6B7280'} />
                <Text
                  style={[
                    styles.thumbLabel,
                    isPositive === false && styles.thumbLabelActive,
                  ]}
                >
                  Needs Improvement
                </Text>
              </Pressable>
            </View>

            {/* Tags */}
            <Text style={styles.sectionLabel}>
              Select tags that apply (optional)
            </Text>
            <View style={styles.tagsGrid}>
              {AVAILABLE_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag) && styles.tagChipActive,
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.tagTextActive,
                    ]}
                  >
                    {TAG_LABELS[tag]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Comment */}
            <Text style={styles.sectionLabel}>
              Add a comment (optional)
            </Text>
            <View style={styles.commentContainer}>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={(text) => setComment(text.slice(0, 200))}
                placeholder="Share your experience..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.charCount}>{comment.length}/200</Text>
            </View>

            {/* Submit */}
            <Pressable
              style={[
                styles.submitButton,
                (loading || isPositive === null) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || isPositive === null}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Submit Rating</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: 16,
    color: '#059669',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  formContent: {
    padding: 24,
    gap: 24,
  },
  caregiverName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'Fraunces_700Bold',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  thumbButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  thumbButtonActiveUp: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  thumbButtonActiveDown: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  thumbEmoji: {
    fontSize: 36,
  },
  thumbLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  thumbLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  tagChipActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  tagText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  tagTextActive: {
    color: '#059669',
    fontWeight: '600',
  },
  commentContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  commentInput: {
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
