/**
 * ReviewsList — Paginated list of caregiver ratings
 *
 * Shows individual reviews: thumbs icon, tag pills, comment, timestamp.
 * 10 per page with "Load More" button.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { shadows } from '@/theme/spacing';

interface CaregiverRating {
  id: string;
  is_positive: boolean;
  tags: string[];
  comment: string | null;
  created_at: string;
  reviewer_user_id: string;
}

const TAG_LABELS: Record<string, string> = {
  reliable: 'Reliable',
  compassionate: 'Compassionate',
  skilled: 'Skilled',
  punctual: 'Punctual',
  professional: 'Professional',
  communicative: 'Communicative',
};

const PAGE_SIZE = 10;

interface Props {
  caregiverProfileId: string;
  caregiverName: string;
  isVisible: boolean;
  onClose: () => void;
}

export function ReviewsList({
  caregiverProfileId,
  caregiverName,
  isVisible,
  onClose,
}: Props) {
  const [reviews, setReviews] = useState<CaregiverRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setReviews([]);
      setPage(0);
      setHasMore(true);
      fetchReviews(0);
    }
  }, [isVisible]);

  async function fetchReviews(pageNum: number) {
    setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('caregiver_ratings')
      .select('id, is_positive, tags, comment, created_at, reviewer_user_id')
      .eq('caregiver_profile_id', caregiverProfileId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      if (pageNum === 0) {
        setReviews(data);
      } else {
        setReviews((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage);
  }

  function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return then.toLocaleDateString();
  }

  const renderReview = useCallback(
    ({ item }: { item: CaregiverRating }) => (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.thumbIcon}>
            {item.is_positive ? '👍' : '👎'}
          </Text>
          <Text style={styles.timestamp}>{getRelativeTime(item.created_at)}</Text>
        </View>

        {item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>
                  {TAG_LABELS[tag] || tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {item.comment && (
          <Text style={styles.commentText}>{item.comment}</Text>
        )}
      </View>
    ),
    []
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={16}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Reviews</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.subtitle}>Reviews for {caregiverName}</Text>

        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>No reviews yet.</Text>
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {loading && <ActivityIndicator color="#059669" />}
              {!loading && hasMore && reviews.length > 0 && (
                <Pressable style={styles.loadMoreButton} onPress={loadMore}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeText: {
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
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thumbIcon: {
    fontSize: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  tagPillText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 40,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
