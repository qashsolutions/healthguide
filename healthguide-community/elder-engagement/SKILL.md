---
name: healthguide-community-elder-engagement
description: Digital engagement activities for seniors to reduce isolation. Includes virtual social events, video calls with family, interest-based activity suggestions, and memory games. Use when building elder entertainment features, family video chat, virtual activities, or cognitive engagement tools.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: community
  tags: [elder-engagement, activities, video-calls, games, socialization]
---

# HealthGuide Elder Engagement

## Overview
Provides digital activities and connections to reduce senior isolation. Features include one-tap video calls with family, virtual group activities, cognitive games, and personalized content based on interests. Designed with large touch targets and simple navigation for elderly users.

## Key Features

- One-tap video calls with family members
- Virtual group activities (book clubs, music sessions)
- Simple cognitive games (memory, trivia)
- Photo sharing with family
- Daily check-in prompts
- Interest-based content recommendations
- Voice-activated controls option

## Data Models

```typescript
interface ElderEngagementProfile {
  id: string;
  elder_id: string;
  interests: string[];
  preferred_activities: string[];
  cognitive_level: 'independent' | 'mild_support' | 'significant_support';
  tech_comfort: 'beginner' | 'moderate' | 'comfortable';
  vision_settings: {
    large_text: boolean;
    high_contrast: boolean;
    text_size_multiplier: number;
  };
  audio_settings: {
    voice_enabled: boolean;
    volume_boost: boolean;
  };
}

interface FamilyVideoContact {
  id: string;
  elder_id: string;
  name: string;
  relationship: string;
  photo_url?: string;
  video_call_link: string; // Pre-configured link
  last_call_at?: string;
  call_count: number;
}

interface VirtualActivity {
  id: string;
  title: string;
  description: string;
  type: 'video_event' | 'game' | 'music' | 'story' | 'exercise';
  difficulty: 'easy' | 'moderate' | 'challenging';
  duration_minutes: number;
  scheduled_at?: string; // For live events
  content_url?: string;
  thumbnail_url: string;
  participant_count?: number;
}

interface GameSession {
  id: string;
  elder_id: string;
  game_type: 'memory' | 'trivia' | 'word' | 'puzzle';
  score: number;
  duration_seconds: number;
  completed_at: string;
}

interface DailyCheckIn {
  id: string;
  elder_id: string;
  check_in_date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  activity_completed: boolean;
  family_contact_made: boolean;
  notes?: string;
}
```

## Instructions

### Step 1: Database Schema

```sql
-- supabase/migrations/022_elder_engagement_tables.sql

-- ============================================
-- ELDER ENGAGEMENT PROFILES
-- ============================================
CREATE TABLE elder_engagement_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  interests TEXT[] DEFAULT '{}',
  preferred_activities TEXT[] DEFAULT '{}',

  cognitive_level TEXT DEFAULT 'independent' CHECK (
    cognitive_level IN ('independent', 'mild_support', 'significant_support')
  ),
  tech_comfort TEXT DEFAULT 'beginner' CHECK (
    tech_comfort IN ('beginner', 'moderate', 'comfortable')
  ),

  vision_settings JSONB DEFAULT '{
    "large_text": true,
    "high_contrast": false,
    "text_size_multiplier": 1.2
  }'::jsonb,

  audio_settings JSONB DEFAULT '{
    "voice_enabled": false,
    "volume_boost": true
  }'::jsonb,

  daily_reminder_time TIME DEFAULT '10:00',
  streak_days INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(elder_id)
);

-- ============================================
-- FAMILY VIDEO CONTACTS
-- ============================================
CREATE TABLE family_video_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  photo_url TEXT,
  video_call_link TEXT NOT NULL, -- FaceTime, Zoom, etc.

  is_favorite BOOLEAN DEFAULT false,
  last_call_at TIMESTAMPTZ,
  call_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_video_contacts_elder ON family_video_contacts(elder_id);

-- ============================================
-- VIRTUAL ACTIVITIES
-- ============================================
CREATE TABLE virtual_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'video_event', 'game', 'music', 'story', 'exercise'
  )),
  difficulty TEXT DEFAULT 'easy' CHECK (
    difficulty IN ('easy', 'moderate', 'challenging')
  ),
  duration_minutes INTEGER,

  -- For scheduled events
  scheduled_at TIMESTAMPTZ,
  meeting_link TEXT,
  host_name TEXT,

  -- For on-demand content
  content_url TEXT,
  thumbnail_url TEXT,

  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  participant_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_activities_type ON virtual_activities(type);
CREATE INDEX idx_virtual_activities_scheduled ON virtual_activities(scheduled_at);

-- ============================================
-- GAME SESSIONS
-- ============================================
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  game_type TEXT NOT NULL CHECK (game_type IN (
    'memory', 'trivia', 'word', 'puzzle'
  )),
  difficulty TEXT DEFAULT 'easy',
  score INTEGER DEFAULT 0,
  max_score INTEGER,
  duration_seconds INTEGER,

  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_elder ON game_sessions(elder_id);
CREATE INDEX idx_game_sessions_type ON game_sessions(game_type);

-- ============================================
-- DAILY CHECK-INS
-- ============================================
CREATE TABLE elder_daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,

  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  activity_completed BOOLEAN DEFAULT false,
  family_contact_made BOOLEAN DEFAULT false,
  volunteer_visit_today BOOLEAN DEFAULT false,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(elder_id, check_in_date)
);

CREATE INDEX idx_elder_daily_checkins_elder ON elder_daily_checkins(elder_id);
CREATE INDEX idx_elder_daily_checkins_date ON elder_daily_checkins(check_in_date);

-- Update streak on check-in
CREATE OR REPLACE FUNCTION update_engagement_streak()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE elder_engagement_profiles
  SET streak_days = CASE
    WHEN EXISTS (
      SELECT 1 FROM elder_daily_checkins
      WHERE elder_id = NEW.elder_id
        AND check_in_date = CURRENT_DATE - INTERVAL '1 day'
    ) THEN streak_days + 1
    ELSE 1
  END
  WHERE elder_id = NEW.elder_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_streak_trigger
AFTER INSERT ON elder_daily_checkins
FOR EACH ROW EXECUTE FUNCTION update_engagement_streak();
```

### Step 2: Elder Home Screen (Simplified UI)

```typescript
// app/(protected)/elder/home.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export default function ElderHomeScreen() {
  const { user, elderProfile } = useAuth();
  const { textScale, highContrast, voiceEnabled } = useAccessibility();
  const router = useRouter();

  const [familyContacts, setFamilyContacts] = useState([]);
  const [todayActivity, setTodayActivity] = useState(null);
  const [checkedInToday, setCheckedInToday] = useState(false);

  useEffect(() => {
    fetchData();
    if (voiceEnabled) {
      Speech.speak('Welcome back! Would you like to call family or do an activity?', {
        rate: 0.8,
      });
    }
  }, []);

  async function fetchData() {
    // Get family video contacts
    const { data: contacts } = await supabase
      .from('family_video_contacts')
      .select('*')
      .eq('elder_id', elderProfile.id)
      .order('is_favorite', { ascending: false })
      .limit(4);

    if (contacts) setFamilyContacts(contacts);

    // Get recommended activity
    const { data: activities } = await supabase
      .from('virtual_activities')
      .select('*')
      .eq('is_active', true)
      .eq('difficulty', 'easy')
      .order('created_at', { ascending: false })
      .limit(1);

    if (activities?.[0]) setTodayActivity(activities[0]);

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: checkIn } = await supabase
      .from('elder_daily_checkins')
      .select('id')
      .eq('elder_id', elderProfile.id)
      .eq('check_in_date', today)
      .single();

    setCheckedInToday(!!checkIn);
  }

  const handleCallFamily = async (contact: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (voiceEnabled) {
      Speech.speak(`Calling ${contact.name}`);
    }

    // Update call stats
    await supabase
      .from('family_video_contacts')
      .update({
        last_call_at: new Date().toISOString(),
        call_count: contact.call_count + 1,
      })
      .eq('id', contact.id);

    // Open video call link
    // Linking.openURL(contact.video_call_link);
    router.push(`/elder/video-call/${contact.id}`);
  };

  const dynamicStyles = {
    title: {
      fontSize: 32 * textScale,
    },
    buttonText: {
      fontSize: 24 * textScale,
    },
    labelText: {
      fontSize: 18 * textScale,
    },
  };

  return (
    <ScrollView
      style={[
        styles.container,
        highContrast && styles.containerHighContrast,
      ]}
      contentContainerStyle={styles.content}
    >
      {/* Greeting */}
      <Text style={[styles.greeting, dynamicStyles.title]}>
        Hello, {elderProfile.first_name}! 👋
      </Text>

      {/* Daily Check-in Prompt */}
      {!checkedInToday && (
        <Pressable
          style={styles.checkInPrompt}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/elder/daily-check-in');
          }}
        >
          <Text style={styles.checkInEmoji}>☀️</Text>
          <Text style={[styles.checkInText, dynamicStyles.labelText]}>
            How are you feeling today?
          </Text>
          <Text style={styles.checkInArrow}>→</Text>
        </Pressable>
      )}

      {/* Call Family Section */}
      <Text style={[styles.sectionTitle, dynamicStyles.labelText]}>
        📞 Call Family
      </Text>
      <View style={styles.familyGrid}>
        {familyContacts.map((contact: any) => (
          <Pressable
            key={contact.id}
            style={[
              styles.familyCard,
              highContrast && styles.familyCardHighContrast,
            ]}
            onPress={() => handleCallFamily(contact)}
            accessibilityRole="button"
            accessibilityLabel={`Video call ${contact.name}, ${contact.relationship}`}
          >
            {contact.photo_url ? (
              <Image source={{ uri: contact.photo_url }} style={styles.familyPhoto} />
            ) : (
              <View style={styles.familyPhotoPlaceholder}>
                <Text style={styles.familyInitial}>
                  {contact.name[0]}
                </Text>
              </View>
            )}
            <Text style={[styles.familyName, dynamicStyles.buttonText]}>
              {contact.name}
            </Text>
            <Text style={styles.familyRelation}>
              {contact.relationship}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Today's Activity */}
      {todayActivity && (
        <>
          <Text style={[styles.sectionTitle, dynamicStyles.labelText]}>
            🎯 Today's Activity
          </Text>
          <Pressable
            style={[
              styles.activityCard,
              highContrast && styles.activityCardHighContrast,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/elder/activities/${todayActivity.id}`);
            }}
          >
            <Image
              source={{ uri: todayActivity.thumbnail_url }}
              style={styles.activityImage}
            />
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, dynamicStyles.buttonText]}>
                {todayActivity.title}
              </Text>
              <Text style={styles.activityDuration}>
                {todayActivity.duration_minutes} minutes
              </Text>
            </View>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶️</Text>
            </View>
          </Pressable>
        </>
      )}

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, dynamicStyles.labelText]}>
        More Activities
      </Text>
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.quickAction, { backgroundColor: '#FEE2E2' }]}
          onPress={() => router.push('/elder/games')}
        >
          <Text style={styles.quickActionIcon}>🎮</Text>
          <Text style={[styles.quickActionLabel, dynamicStyles.labelText]}>
            Games
          </Text>
        </Pressable>

        <Pressable
          style={[styles.quickAction, { backgroundColor: '#E0E7FF' }]}
          onPress={() => router.push('/elder/music')}
        >
          <Text style={styles.quickActionIcon}>🎵</Text>
          <Text style={[styles.quickActionLabel, dynamicStyles.labelText]}>
            Music
          </Text>
        </Pressable>

        <Pressable
          style={[styles.quickAction, { backgroundColor: '#D1FAE5' }]}
          onPress={() => router.push('/elder/photos')}
        >
          <Text style={styles.quickActionIcon}>📷</Text>
          <Text style={[styles.quickActionLabel, dynamicStyles.labelText]}>
            Photos
          </Text>
        </Pressable>

        <Pressable
          style={[styles.quickAction, { backgroundColor: '#FEF3C7' }]}
          onPress={() => router.push('/elder/events')}
        >
          <Text style={styles.quickActionIcon}>📅</Text>
          <Text style={[styles.quickActionLabel, dynamicStyles.labelText]}>
            Events
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerHighContrast: {
    backgroundColor: '#000000',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  checkInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    marginBottom: 32,
  },
  checkInEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  checkInText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
  },
  checkInArrow: {
    fontSize: 24,
    color: '#92400E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  familyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  familyCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyCardHighContrast: {
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  familyPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  familyPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  familyInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  familyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  familyRelation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  activityCardHighContrast: {
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activityImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 24,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickAction: {
    width: '47%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
});
```

### Step 3: Simple Memory Game

```typescript
// app/(protected)/elder/games/memory.tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const EMOJIS = ['🌸', '🌻', '🌺', '🌹', '🌷', '🌼'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGameScreen() {
  const { elderProfile } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    // Create pairs of cards
    const gameEmojis = EMOJIS.slice(0, 6); // 6 pairs = 12 cards
    const cardPairs = [...gameEmojis, ...gameEmojis];

    // Shuffle
    const shuffled = cardPairs
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
    setStartTime(new Date());
    setGameComplete(false);
  }

  const handleCardPress = useCallback((cardId: number) => {
    if (flippedCards.length === 2) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Flip card
    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    // Check for match if two cards flipped
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      const [first, second] = newFlipped;
      const card1 = newCards.find((c) => c.id === first);
      const card2 = newCards.find((c) => c.id === second);

      if (card1?.emoji === card2?.emoji) {
        // Match!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatches((m) => m + 1);
          setFlippedCards([]);

          // Check win
          if (matches + 1 === 6) {
            handleGameComplete();
          }
        }, 500);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [cards, flippedCards, matches]);

  async function handleGameComplete() {
    setGameComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const duration = Math.round(
      (new Date().getTime() - startTime!.getTime()) / 1000
    );

    // Save game session
    await supabase.from('game_sessions').insert({
      elder_id: elderProfile.id,
      game_type: 'memory',
      difficulty: 'easy',
      score: Math.max(100 - moves * 5, 10), // Score based on moves
      max_score: 100,
      duration_seconds: duration,
    });

    Alert.alert(
      '🎉 Great Job!',
      `You completed the game in ${moves} moves!`,
      [
        { text: 'Play Again', onPress: initializeGame },
        { text: 'Done', onPress: () => router.back() },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Memory Game</Text>
        <Text style={styles.stats}>
          Matches: {matches}/6 • Moves: {moves}
        </Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            style={[
              styles.card,
              card.isFlipped && styles.cardFlipped,
              card.isMatched && styles.cardMatched,
            ]}
            onPress={() => handleCardPress(card.id)}
            disabled={card.isMatched || flippedCards.length === 2}
          >
            {card.isFlipped || card.isMatched ? (
              <Text style={styles.emoji}>{card.emoji}</Text>
            ) : (
              <Text style={styles.cardBack}>?</Text>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.resetButton} onPress={initializeGame}>
        <Text style={styles.resetText}>🔄 New Game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stats: {
    fontSize: 18,
    color: '#6B7280',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  card: {
    width: 100,
    height: 100,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFlipped: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  cardMatched: {
    backgroundColor: '#D1FAE5',
    borderWidth: 3,
    borderColor: '#10B981',
  },
  cardBack: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emoji: {
    fontSize: 48,
  },
  resetButton: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
```

### Step 4: Daily Check-In for Elders

```typescript
// app/(protected)/elder/daily-check-in.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Not Good', color: '#FEE2E2' },
  { value: 2, emoji: '😕', label: 'Okay', color: '#FEF3C7' },
  { value: 3, emoji: '🙂', label: 'Good', color: '#D1FAE5' },
  { value: 4, emoji: '😊', label: 'Happy', color: '#DBEAFE' },
  { value: 5, emoji: '🥰', label: 'Great!', color: '#F3E8FF' },
];

export default function ElderDailyCheckInScreen() {
  const { elderProfile } = useAuth();
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleMoodSelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMood(value);

    const moodOption = MOOD_OPTIONS.find((m) => m.value === value);
    Speech.speak(`You're feeling ${moodOption?.label}`, { rate: 0.8 });
  };

  async function handleSubmit() {
    if (!mood) return;

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await supabase.from('elder_daily_checkins').insert({
      elder_id: elderProfile.id,
      mood,
    });

    // Notify family if mood is low
    if (mood <= 2) {
      await supabase.functions.invoke('notify-family-elder-mood', {
        body: {
          elder_id: elderProfile.id,
          mood,
        },
      });
    }

    Speech.speak("Thank you! Have a wonderful day!", { rate: 0.8 });

    setSaving(false);
    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Good Morning! ☀️</Text>
      <Text style={styles.subtitle}>How are you feeling today?</Text>

      <View style={styles.moodGrid}>
        {MOOD_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.moodCard,
              { backgroundColor: option.color },
              mood === option.value && styles.moodCardSelected,
            ]}
            onPress={() => handleMoodSelect(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: mood === option.value }}
          >
            <Text style={styles.moodEmoji}>{option.emoji}</Text>
            <Text style={styles.moodLabel}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Button
        title="Done ✓"
        onPress={handleSubmit}
        disabled={!mood}
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
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#6B7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  moodGrid: {
    width: '100%',
    gap: 16,
    marginBottom: 48,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    gap: 20,
  },
  moodCardSelected: {
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  moodEmoji: {
    fontSize: 56,
  },
  moodLabel: {
    fontSize: 28,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    width: '100%',
    paddingVertical: 20,
  },
});
```

### Step 5: Family Mood Alert Function

```typescript
// supabase/functions/notify-family-elder-mood/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { elder_id, mood } = await req.json();

  // Get elder info
  const { data: elder } = await supabase
    .from('elders')
    .select('first_name')
    .eq('id', elder_id)
    .single();

  // Get family contacts
  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('elder_id', elder_id)
    .eq('receives_notifications', true);

  if (!contacts || contacts.length === 0) {
    return new Response(JSON.stringify({ notified: 0 }));
  }

  const moodText = mood === 1 ? 'not feeling well' : 'feeling a bit low';

  for (const contact of contacts) {
    const message = `HealthGuide: ${elder!.first_name} checked in today and is ${moodText}. Consider giving them a call! 💙`;

    await supabase.functions.invoke('send-sms', {
      body: {
        to: contact.phone,
        body: message,
        contact_id: contact.id,
        elder_id,
        message_type: 'mood_alert',
      },
    });
  }

  return new Response(
    JSON.stringify({ notified: contacts.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Accessibility Context

```typescript
// contexts/AccessibilityContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AccessibilitySettings {
  textScale: number;
  highContrast: boolean;
  voiceEnabled: boolean;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
}

const AccessibilityContext = createContext<AccessibilitySettings>({
  textScale: 1.2,
  highContrast: false,
  voiceEnabled: false,
  updateSettings: () => {},
});

export function AccessibilityProvider({ children, elderId }: { children: React.ReactNode; elderId: string }) {
  const [settings, setSettings] = useState({
    textScale: 1.2,
    highContrast: false,
    voiceEnabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, [elderId]);

  async function loadSettings() {
    const { data } = await supabase
      .from('elder_engagement_profiles')
      .select('vision_settings, audio_settings')
      .eq('elder_id', elderId)
      .single();

    if (data) {
      setSettings({
        textScale: data.vision_settings?.text_size_multiplier || 1.2,
        highContrast: data.vision_settings?.high_contrast || false,
        voiceEnabled: data.audio_settings?.voice_enabled || false,
      });
    }
  }

  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));

    await supabase
      .from('elder_engagement_profiles')
      .update({
        vision_settings: {
          text_size_multiplier: newSettings.textScale ?? settings.textScale,
          high_contrast: newSettings.highContrast ?? settings.highContrast,
        },
        audio_settings: {
          voice_enabled: newSettings.voiceEnabled ?? settings.voiceEnabled,
        },
      })
      .eq('elder_id', elderId);
  };

  return (
    <AccessibilityContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
```

## Troubleshooting

### Voice not working
**Cause:** expo-speech not installed or permissions denied
**Solution:** Install expo-speech, ensure audio permissions granted

### Video call not opening
**Cause:** Invalid link format or app not installed
**Solution:** Validate URL format, fall back to browser-based calling

### Game scores not saving
**Cause:** RLS policy blocking insert
**Solution:** Ensure elder has engagement profile created
