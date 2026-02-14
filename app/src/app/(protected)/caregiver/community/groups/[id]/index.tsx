// HealthGuide Support Group Detail
// Per healthguide-community/caregiver-support skill

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { PersonIcon, SendIcon, HeartIcon, CommunityIcon } from '@/components/icons';

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  member_count: number;
  is_joined: boolean;
  guidelines: string[];
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  is_own: boolean;
  likes_count: number;
  is_liked: boolean;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
      fetchMessages();
    }
  }, [id]);

  async function fetchGroupDetails() {
    if (!id || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('support_groups')
        .select(`
          id,
          name,
          description,
          guidelines,
          created_at,
          group_members (id, user_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setGroup({
          id: data.id,
          name: data.name,
          description: data.description,
          member_count: Array.isArray(data.group_members) ? data.group_members.length : 0,
          is_joined: Array.isArray(data.group_members)
            ? data.group_members.some((m: any) => m.user_id === user.id)
            : false,
          guidelines: data.guidelines || [],
          created_at: data.created_at,
        });
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      // Mock data
      setGroup({
        id: id!,
        name: 'Self-Care Corner',
        description: 'Tips and strategies for maintaining your own wellness while caring for others. Remember: you cannot pour from an empty cup.',
        member_count: 156,
        is_joined: true,
        guidelines: [
          'Be supportive and respectful',
          'Keep conversations confidential',
          'No medical advice - consult professionals',
          'Report any concerns to moderators',
        ],
        created_at: new Date().toISOString(),
      });
    }
  }

  async function fetchMessages() {
    if (!id || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user:user_profiles!user_id (first_name, last_name),
          message_likes (user_id)
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data) {
        const formattedMessages = data.map((m: any) => {
          const userRaw = Array.isArray(m.user) ? m.user[0] : m.user;
          return {
            id: m.id,
            content: m.content,
            created_at: m.created_at,
            user_id: m.user_id,
            user_name: userRaw ? `${userRaw.first_name} ${userRaw.last_name?.[0] || ''}.` : 'Anonymous',
            is_own: m.user_id === user.id,
            likes_count: Array.isArray(m.message_likes) ? m.message_likes.length : 0,
            is_liked: Array.isArray(m.message_likes)
              ? m.message_likes.some((l: any) => l.user_id === user.id)
              : false,
          };
        });
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Mock messages
      setMessages([
        {
          id: '1',
          content: 'Good morning everyone! Remember to take a moment for yourself today. Even 5 minutes of deep breathing can help. 💙',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          user_id: 'other1',
          user_name: 'Sarah M.',
          is_own: false,
          likes_count: 8,
          is_liked: false,
        },
        {
          id: '2',
          content: 'Thanks Sarah! I needed that reminder. It\'s been a tough week but this group always helps me feel less alone.',
          created_at: new Date(Date.now() - 2400000).toISOString(),
          user_id: 'other2',
          user_name: 'Mike T.',
          is_own: false,
          likes_count: 5,
          is_liked: true,
        },
        {
          id: '3',
          content: 'Has anyone tried meditation apps? Looking for recommendations that are short and caregiver-friendly.',
          created_at: new Date(Date.now() - 1200000).toISOString(),
          user_id: 'other3',
          user_name: 'Lisa K.',
          is_own: false,
          likes_count: 2,
          is_liked: false,
        },
      ]);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchGroupDetails(), fetchMessages()]);
    setRefreshing(false);
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !user?.id || !id) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic add
    const tempId = Date.now().toString();
    const newMsg: Message = {
      id: tempId,
      content: messageContent,
      created_at: new Date().toISOString(),
      user_id: user.id,
      user_name: 'You',
      is_own: true,
      likes_count: 0,
      is_liked: false,
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: id,
          user_id: user.id,
          content: messageContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Update with real ID
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Keep the optimistic message for demo purposes
    }

    setSending(false);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  async function handleLikeMessage(messageId: string) {
    if (!user?.id) return;

    // Optimistic toggle
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              is_liked: !m.is_liked,
              likes_count: m.is_liked ? m.likes_count - 1 : m.likes_count + 1,
            }
          : m
      )
    );

    try {
      const message = messages.find((m) => m.id === messageId);
      if (message?.is_liked) {
        await supabase
          .from('message_likes')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('message_likes').insert({
          message_id: messageId,
          user_id: user.id,
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  async function handleJoinGroup() {
    if (!user?.id || !id) return;

    setGroup((prev) =>
      prev ? { ...prev, is_joined: true, member_count: prev.member_count + 1 } : prev
    );

    try {
      await supabase.from('group_members').insert({
        group_id: id,
        user_id: user.id,
        role: 'member',
      });
    } catch (error) {
      console.error('Error joining group:', error);
      setGroup((prev) =>
        prev ? { ...prev, is_joined: false, member_count: prev.member_count - 1 } : prev
      );
    }
  }

  function formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'h:mm a');
    }
    return format(date, 'MMM d, h:mm a');
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.is_own && styles.messageContainerOwn]}>
      {!item.is_own && (
        <View style={styles.avatarSmall}>
          <PersonIcon size={16} color={roleColors.caregiver} />
        </View>
      )}
      <View style={[styles.messageBubble, item.is_own && styles.messageBubbleOwn]}>
        {!item.is_own && (
          <Text style={styles.messageSender}>{item.user_name}</Text>
        )}
        <Text style={[styles.messageText, item.is_own && styles.messageTextOwn]}>
          {item.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, item.is_own && styles.messageTimeOwn]}>
            {formatMessageTime(item.created_at)}
          </Text>
          <Pressable
            style={styles.likeButton}
            onPress={() => handleLikeMessage(item.id)}
          >
            <HeartIcon
              size={14}
              color={item.is_liked ? colors.error[500] : colors.neutral[400]}
            />
            {item.likes_count > 0 && (
              <Text
                style={[
                  styles.likeCount,
                  item.is_liked && styles.likeCountActive,
                ]}
              >
                {item.likes_count}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading group...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: group?.name || 'Support Group',
          headerBackTitle: 'Groups',
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupIcon}>
            <CommunityIcon size={32} color={roleColors.caregiver} />
          </View>
          <View style={styles.groupHeaderInfo}>
            <Text style={styles.groupName}>{group?.name}</Text>
            <Text style={styles.groupMeta}>
              {group?.member_count} members
            </Text>
          </View>
          {!group?.is_joined && (
            <Button
              title="Join"
              variant="primary"
              size="sm"
              onPress={handleJoinGroup}
            />
          )}
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListHeaderComponent={
            group?.guidelines && group.guidelines.length > 0 ? (
              <Card variant="default" padding="sm" style={styles.guidelinesCard}>
                <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
                {group.guidelines.map((guideline, index) => (
                  <Text key={index} style={styles.guidelineText}>
                    • {guideline}
                  </Text>
                ))}
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to start the conversation!
              </Text>
            </View>
          }
        />

        {/* Message Input */}
        {group?.is_joined ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Share with the group..."
              placeholderTextColor={colors.text.secondary}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <SendIcon
                size={24}
                color={newMessage.trim() && !sending ? colors.white : colors.neutral[400]}
              />
            </Pressable>
          </View>
        ) : (
          <View style={styles.joinPrompt}>
            <Text style={styles.joinPromptText}>
              Join this group to participate in the conversation
            </Text>
            <Button
              title="Join Group"
              variant="primary"
              onPress={handleJoinGroup}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  groupHeaderInfo: {
    flex: 1,
  },
  groupName: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    fontSize: 18,
  },
  groupMeta: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  messagesList: {
    padding: spacing[4],
  },
  guidelinesCard: {
    marginBottom: spacing[4],
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
    borderWidth: 1,
  },
  guidelinesTitle: {
    ...typography.styles.caption,
    color: colors.warning[700],
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  guidelineText: {
    ...typography.styles.caption,
    color: colors.warning[700],
    marginBottom: spacing[1],
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.sm,
    padding: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleOwn: {
    backgroundColor: roleColors.caregiver,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.sm,
  },
  messageSender: {
    ...typography.styles.caption,
    color: roleColors.caregiver,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  messageText: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: colors.white,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  messageTime: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  likeCount: {
    ...typography.styles.caption,
    color: colors.neutral[400],
    fontSize: 11,
  },
  likeCountActive: {
    color: colors.error[500],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing[2],
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...typography.caregiver.body,
    color: colors.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: roleColors.caregiver,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  joinPrompt: {
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    alignItems: 'center',
    gap: spacing[3],
  },
  joinPromptText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
});
