// HealthGuide — In-App Notification Center
// Shows all notifications grouped by day with read/unread state
// Shared across all roles

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

const TYPE_ICONS: Record<string, string> = {
  visit_request: '\uD83D\uDCC5',
  visit_confirmed: '\u2705',
  visit_declined: '\u274C',
  visit_cancelled: '\uD83D\uDEAB',
  visit_completed: '\u2B50',
  emergency: '\uD83D\uDEA8',
  agency_invite: '\uD83E\uDD1D',
  agency_application: '\uD83D\uDCE9',
  rating_request: '\u2B50',
  no_show: '\u26A0\uFE0F',
  auto_match: '\uD83D\uDD17',
  shift_reminder: '\u23F0',
  check_in_alert: '\uD83D\uDCCD',
  check_out_alert: '\uD83D\uDC4B',
  general: '\uD83D\uDD14',
};

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  data: any;
  read: boolean;
  created_at: string;
}

interface Section {
  title: string;
  data: NotificationItem[];
}

export default function NotificationCenterScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by day
      const groups: Record<string, NotificationItem[]> = {};
      for (const item of data || []) {
        const date = parseISO(item.created_at);
        let label: string;
        if (isToday(date)) label = 'Today';
        else if (isYesterday(date)) label = 'Yesterday';
        else label = format(date, 'EEE, MMM d');

        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
      }

      const sectionList: Section[] = Object.entries(groups).map(([title, items]) => ({
        title,
        data: items,
      }));

      setSections(sectionList);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        data: section.data.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item,
        ),
      })),
    );
  }

  async function markAllRead() {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        data: section.data.map((item) => ({ ...item, read: true })),
      })),
    );
  }

  function handleNotificationPress(item: NotificationItem) {
    // Mark as read
    if (!item.read) markAsRead(item.id);

    // Navigate based on type
    const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
    if (!data) return;

    if (data.visitId) {
      router.push(`/(protected)/caregiver/visit/${data.visitId}` as any);
    } else if (data.requestId) {
      // Could navigate to requests
    }
  }

  function formatTimeAgo(dateStr: string): string {
    const date = parseISO(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return format(date, 'h:mm a');
  }

  const hasUnread = sections.some((s) => s.data.some((d) => !d.read));

  function renderNotification({ item }: { item: NotificationItem }) {
    const icon = TYPE_ICONS[item.type] || TYPE_ICONS.general;

    return (
      <Pressable
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>{icon}</Text>
          <View style={styles.notifContent}>
            <View style={styles.notifHeader}>
              <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notifTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerBackTitle: 'Back',
          headerRight: hasUnread
            ? () => (
                <Pressable onPress={markAllRead} style={styles.markAllButton}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>{'\uD83D\uDD14'}</Text>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySubtitle}>
                  You'll see visit updates, reminders, and messages here
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  sectionHeader: {
    ...typography.styles.label,
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  markAllButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  markAllText: {
    ...typography.styles.bodySmall,
    color: colors.primary[500],
    fontWeight: '600',
  },

  // Notification card
  notifCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  notifCardUnread: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[100],
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  notifIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  notifTitle: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifTime: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginLeft: spacing[2],
  },
  notifBody: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginTop: 6,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[2],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  emptyTitle: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
});
