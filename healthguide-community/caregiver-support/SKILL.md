---
name: healthguide-community-caregiver-support
description: Virtual peer support communities for caregivers. Includes support groups, discussion forums, resource sharing, and wellness check-ins. Reduces isolation through connection with other caregivers. Use when building caregiver community features, support groups, forums, or peer connection tools.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: community
  tags: [community, support-groups, peer-support, caregiver-wellness, forums]
---

# HealthGuide Caregiver Support Community

## Overview
Caregivers often experience isolation and burnout. This feature creates virtual peer support communities where caregivers can connect, share experiences, ask questions, and support each other - regardless of geographic location.

## Key Features

- Topic-based support groups (burnout, self-care, specific conditions)
- Anonymous posting option for sensitive topics
- Scheduled virtual meetups / group chats
- Resource library with community-contributed tips
- Wellness check-ins with peer encouragement
- Moderated safe space with reporting tools
- Badge/recognition system for helpful members

## Data Models

```typescript
interface SupportGroup {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'burnout' | 'self_care' | 'dementia' | 'mobility' | 'end_of_life' | 'new_caregiver';
  icon: string;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string; // Can be anonymous
  is_anonymous: boolean;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  last_active_at: string;
}

interface ForumPost {
  id: string;
  group_id: string;
  author_id: string;
  author_display_name: string;
  is_anonymous: boolean;
  title: string;
  content: string;
  category: 'question' | 'story' | 'tip' | 'vent' | 'celebration';
  tags: string[];
  like_count: number;
  reply_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface PostReply {
  id: string;
  post_id: string;
  author_id: string;
  author_display_name: string;
  is_anonymous: boolean;
  content: string;
  like_count: number;
  is_helpful: boolean; // Marked by OP
  created_at: string;
}

interface WellnessCheckIn {
  id: string;
  user_id: string;
  mood_level: 1 | 2 | 3 | 4 | 5;
  stress_level: 1 | 2 | 3 | 4 | 5;
  sleep_quality: 1 | 2 | 3 | 4 | 5;
  self_care_today: boolean;
  notes?: string;
  created_at: string;
}

interface CommunityResource {
  id: string;
  title: string;
  description: string;
  category: 'article' | 'video' | 'tip' | 'checklist' | 'external_link';
  content_url?: string;
  content_body?: string;
  contributed_by: string;
  upvote_count: number;
  created_at: string;
}
```

## Instructions

### Step 1: Database Schema for Community

```sql
-- supabase/migrations/020_community_tables.sql

-- ============================================
-- SUPPORT GROUPS TABLE
-- ============================================
CREATE TABLE support_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'general', 'burnout', 'self_care', 'dementia',
    'mobility', 'end_of_life', 'new_caregiver'
  )),
  icon TEXT NOT NULL DEFAULT '💬',
  member_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,

  -- Moderation
  requires_approval BOOLEAN DEFAULT false,
  guidelines TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_groups_category ON support_groups(category);

-- ============================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),

  -- Notification preferences
  notify_new_posts BOOLEAN DEFAULT true,
  notify_replies BOOLEAN DEFAULT true,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);

-- Auto-update member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE support_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE support_groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_member_count_trigger
AFTER INSERT OR DELETE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ============================================
-- FORUM POSTS TABLE
-- ============================================
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  author_display_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,

  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'question', 'story', 'tip', 'vent', 'celebration'
  )),
  tags TEXT[] DEFAULT '{}',

  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false, -- For moderation

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_group ON forum_posts(group_id);
CREATE INDEX idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_category ON forum_posts(category);
CREATE INDEX idx_forum_posts_created ON forum_posts(created_at DESC);

-- ============================================
-- POST REPLIES TABLE
-- ============================================
CREATE TABLE post_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  author_display_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  content TEXT NOT NULL,

  like_count INTEGER DEFAULT 0,
  is_helpful BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_replies_post ON post_replies(post_id);

-- Auto-update reply count
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET reply_count = reply_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_reply_count_trigger
AFTER INSERT OR DELETE ON post_replies
FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- ============================================
-- POST LIKES TABLE
-- ============================================
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES post_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either post or reply, not both
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id)
);

-- ============================================
-- WELLNESS CHECK-INS TABLE
-- ============================================
CREATE TABLE wellness_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  mood_level INTEGER NOT NULL CHECK (mood_level BETWEEN 1 AND 5),
  stress_level INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 5),
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  self_care_today BOOLEAN DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wellness_checkins_user ON wellness_checkins(user_id);
CREATE INDEX idx_wellness_checkins_date ON wellness_checkins(created_at);

-- ============================================
-- COMMUNITY RESOURCES TABLE
-- ============================================
CREATE TABLE community_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'article', 'video', 'tip', 'checklist', 'external_link'
  )),
  content_url TEXT,
  content_body TEXT,
  contributed_by UUID REFERENCES user_profiles(id),

  upvote_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_resources_category ON community_resources(category);
```

### Step 2: Support Groups List Screen

```typescript
// app/(protected)/community/groups/index.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroupCard } from '@/components/community/GroupCard';
import { CategoryFilter } from '@/components/community/CategoryFilter';
import * as Haptics from 'expo-haptics';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'general', label: 'General', icon: '💬' },
  { id: 'burnout', label: 'Burnout', icon: '🔥' },
  { id: 'self_care', label: 'Self-Care', icon: '🧘' },
  { id: 'dementia', label: 'Dementia Care', icon: '🧠' },
  { id: 'new_caregiver', label: 'New Caregivers', icon: '🌱' },
];

export default function SupportGroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [myGroups, setMyGroups] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchMyMemberships();
  }, [selectedCategory]);

  async function fetchGroups() {
    let query = supabase
      .from('support_groups')
      .select('*')
      .eq('is_public', true)
      .order('member_count', { ascending: false });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data } = await query;
    if (data) setGroups(data);
    setLoading(false);
  }

  async function fetchMyMemberships() {
    const { data } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user!.id);

    if (data) {
      setMyGroups(data.map((m) => m.group_id));
    }
  }

  async function joinGroup(groupId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name')
      .eq('id', user!.id)
      .single();

    await supabase.from('group_memberships').insert({
      group_id: groupId,
      user_id: user!.id,
      display_name: profile?.first_name || 'Caregiver',
      is_anonymous: false,
    });

    setMyGroups([...myGroups, groupId]);
    fetchGroups(); // Refresh counts
  }

  const handleGroupPress = (group: SupportGroup) => {
    if (myGroups.includes(group.id)) {
      router.push(`/community/groups/${group.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Support Groups</Text>
        <Text style={styles.subtitle}>
          Connect with caregivers who understand your journey
        </Text>
      </View>

      <CategoryFilter
        categories={CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <FlatList
        data={groups}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            isMember={myGroups.includes(item.id)}
            onPress={() => handleGroupPress(item)}
            onJoin={() => joinGroup(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchGroups();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No groups found in this category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  list: {
    padding: 16,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
});
```

### Step 3: Group Detail / Forum Screen

```typescript
// app/(protected)/community/groups/[id].tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/community/PostCard';
import { PostCategoryTabs } from '@/components/community/PostCategoryTabs';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { PlusIcon } from '@/components/icons';

const POST_CATEGORIES = [
  { id: 'all', label: 'All Posts' },
  { id: 'question', label: '❓ Questions' },
  { id: 'story', label: '📖 Stories' },
  { id: 'tip', label: '💡 Tips' },
  { id: 'vent', label: '💭 Venting' },
  { id: 'celebration', label: '🎉 Wins' },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<SupportGroup | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [membership, setMembership] = useState<GroupMembership | null>(null);

  useEffect(() => {
    fetchGroup();
    fetchPosts();
    fetchMembership();
    subscribeToNewPosts();
  }, [id, selectedCategory]);

  async function fetchGroup() {
    const { data } = await supabase
      .from('support_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (data) setGroup(data);
  }

  async function fetchPosts() {
    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        author:user_profiles (first_name, photo_url)
      `)
      .eq('group_id', id)
      .eq('is_hidden', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data } = await query.limit(50);
    if (data) setPosts(data);
  }

  async function fetchMembership() {
    const { data } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', user!.id)
      .single();

    if (data) setMembership(data);
  }

  function subscribeToNewPosts() {
    const channel = supabase
      .channel(`group-${id}-posts`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_posts',
          filter: `group_id=eq.${id}`,
        },
        () => fetchPosts()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  const handleCreatePost = () => {
    router.push(`/community/groups/${id}/create-post`);
  };

  const handlePostPress = (post: ForumPost) => {
    router.push(`/community/posts/${post.id}`);
  };

  async function handleLikePost(postId: string) {
    // Toggle like
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', user!.id)
      .eq('post_id', postId)
      .single();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { post_id: postId });
    } else {
      await supabase.from('post_likes').insert({
        user_id: user!.id,
        post_id: postId,
      });
      await supabase.rpc('increment_post_likes', { post_id: postId });
    }

    fetchPosts();
  }

  if (!group) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.groupIcon}>{group.icon}</Text>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.memberCount}>
          {group.member_count} members
        </Text>
      </View>

      <PostCategoryTabs
        categories={POST_CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => handlePostPress(item)}
            onLike={() => handleLikePost(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to share something!
            </Text>
          </View>
        }
      />

      <FloatingActionButton
        icon={<PlusIcon size={24} color="#FFFFFF" />}
        onPress={handleCreatePost}
        label="New Post"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  empty: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
```

### Step 4: Wellness Check-In Screen

```typescript
// app/(protected)/community/wellness/check-in.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import * as Haptics from 'expo-haptics';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Struggling' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
];

const STRESS_OPTIONS = [
  { value: 1, emoji: '😌', label: 'Calm' },
  { value: 2, emoji: '😐', label: 'Mild' },
  { value: 3, emoji: '😟', label: 'Moderate' },
  { value: 4, emoji: '😰', label: 'High' },
  { value: 5, emoji: '🤯', label: 'Overwhelmed' },
];

const SLEEP_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😴', label: 'Poor' },
  { value: 3, emoji: '🛌', label: 'Fair' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '✨', label: 'Excellent' },
];

export default function WellnessCheckInScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [selfCare, setSelfCare] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelect = (setter: (val: number) => void, value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  };

  async function handleSubmit() {
    if (!mood || !stress || !sleep) return;

    setSaving(true);

    await supabase.from('wellness_checkins').insert({
      user_id: user!.id,
      mood_level: mood,
      stress_level: stress,
      sleep_quality: sleep,
      self_care_today: selfCare,
      notes: notes || null,
    });

    setSaving(false);
    router.back();
  }

  const renderOptions = (
    title: string,
    options: typeof MOOD_OPTIONS,
    selected: number | null,
    onSelect: (val: number) => void
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsRow}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.optionButton,
              selected === opt.value && styles.optionButtonSelected,
            ]}
            onPress={() => handleSelect(onSelect, opt.value)}
          >
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                selected === opt.value && styles.optionLabelSelected,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.subtitle}>
        Regular check-ins help you track your wellbeing over time
      </Text>

      {renderOptions('Your Mood', MOOD_OPTIONS, mood, setMood)}
      {renderOptions('Stress Level', STRESS_OPTIONS, stress, setStress)}
      {renderOptions('Sleep Quality', SLEEP_OPTIONS, sleep, setSleep)}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Self-Care Today</Text>
        <Pressable
          style={[styles.selfCareButton, selfCare && styles.selfCareButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelfCare(!selfCare);
          }}
        >
          <Text style={styles.selfCareEmoji}>{selfCare ? '✅' : '⬜'}</Text>
          <Text style={styles.selfCareText}>
            I did something for myself today
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextArea
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything you want to remember about today..."
          maxLength={500}
        />
      </View>

      <Button
        title="Save Check-In"
        onPress={handleSubmit}
        disabled={!mood || !stress || !sleep}
        loading={saving}
        size="large"
        style={styles.submitButton}
      />
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
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 64,
  },
  optionButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  optionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
  },
  selfCareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 12,
  },
  selfCareButtonActive: {
    backgroundColor: '#D1FAE5',
  },
  selfCareEmoji: {
    fontSize: 24,
  },
  selfCareText: {
    fontSize: 16,
    color: '#374151',
  },
  submitButton: {
    marginTop: 16,
  },
});
```

### Step 5: Create Post Screen

```typescript
// app/(protected)/community/groups/[id]/create-post.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LargeInput } from '@/components/ui/LargeInput';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

const POST_TYPES = [
  { id: 'question', emoji: '❓', label: 'Question', description: 'Ask for advice or help' },
  { id: 'story', emoji: '📖', label: 'Story', description: 'Share your experience' },
  { id: 'tip', emoji: '💡', label: 'Tip', description: 'Share helpful advice' },
  { id: 'vent', emoji: '💭', label: 'Vent', description: 'Get it off your chest' },
  { id: 'celebration', emoji: '🎉', label: 'Win', description: 'Celebrate a victory' },
];

export default function CreatePostScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!category || !title.trim() || !content.trim()) return;

    setPosting(true);

    // Get display name
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('display_name')
      .eq('group_id', groupId)
      .eq('user_id', user!.id)
      .single();

    const displayName = isAnonymous
      ? 'Anonymous Caregiver'
      : membership?.display_name || 'Caregiver';

    await supabase.from('forum_posts').insert({
      group_id: groupId,
      author_id: user!.id,
      author_display_name: displayName,
      is_anonymous: isAnonymous,
      title: title.trim(),
      content: content.trim(),
      category,
    });

    setPosting(false);
    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Post</Text>

      <Text style={styles.label}>What type of post?</Text>
      <View style={styles.typeGrid}>
        {POST_TYPES.map((type) => (
          <Pressable
            key={type.id}
            style={[
              styles.typeCard,
              category === type.id && styles.typeCardSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCategory(type.id);
            }}
          >
            <Text style={styles.typeEmoji}>{type.emoji}</Text>
            <Text
              style={[
                styles.typeLabel,
                category === type.id && styles.typeLabelSelected,
              ]}
            >
              {type.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <LargeInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Give your post a title..."
        maxLength={100}
      />

      <TextArea
        label="Share your thoughts"
        value={content}
        onChangeText={setContent}
        placeholder="Write as much as you'd like..."
        minHeight={150}
        maxLength={5000}
      />

      <View style={styles.anonymousRow}>
        <View style={styles.anonymousInfo}>
          <Text style={styles.anonymousLabel}>Post Anonymously</Text>
          <Text style={styles.anonymousHint}>
            Your name won't be shown on this post
          </Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
          thumbColor={isAnonymous ? '#3B82F6' : '#F3F4F6'}
        />
      </View>

      <Button
        title="Post"
        onPress={handlePost}
        disabled={!category || !title.trim() || !content.trim()}
        loading={posting}
        size="large"
        style={styles.postButton}
      />
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
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 80,
  },
  typeCardSelected: {
    backgroundColor: '#3B82F6',
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeLabelSelected: {
    color: '#FFFFFF',
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  anonymousInfo: {
    flex: 1,
  },
  anonymousLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  anonymousHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  postButton: {
    marginTop: 8,
  },
});
```

## RLS Policies for Community Tables

```sql
-- Community RLS Policies

-- Support groups: public groups visible to all authenticated users
CREATE POLICY "Anyone can view public groups"
ON support_groups FOR SELECT
TO authenticated
USING (is_public = true);

-- Memberships: users can see their own
CREATE POLICY "Users can view own memberships"
ON group_memberships FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can join groups
CREATE POLICY "Users can join groups"
ON group_memberships FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Posts visible to group members
CREATE POLICY "Group members can view posts"
ON forum_posts FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
  )
);

-- Members can create posts
CREATE POLICY "Members can create posts"
ON forum_posts FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() AND
  group_id IN (
    SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
  )
);

-- Wellness check-ins: users see only their own
CREATE POLICY "Users can manage own wellness data"
ON wellness_checkins FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## Troubleshooting

### Anonymous posts showing real name
**Cause:** Display name not being set correctly
**Solution:** Always set `author_display_name` to 'Anonymous Caregiver' when `is_anonymous` is true

### Posts not appearing in real-time
**Cause:** Supabase subscription not configured
**Solution:** Enable realtime for `forum_posts` table in Supabase dashboard

### Wellness trends not showing
**Cause:** Insufficient data points
**Solution:** Require minimum 7 check-ins before showing trends
