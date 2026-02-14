// HealthGuide Caregiver Journal
// Simple journaling screen with local AsyncStorage entries

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { PlusIcon } from '@/components/icons';

interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  text: string;
}

const MOODS = [
  { emoji: '😊', label: 'Great' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😔', label: 'Low' },
  { emoji: '😢', label: 'Tough' },
];

const STORAGE_KEY = '@healthguide_journal_entries';

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [entryText, setEntryText] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  }

  async function saveEntry() {
    if (!selectedMood) {
      Alert.alert('Select Mood', 'Please select how you\'re feeling.');
      return;
    }
    if (!entryText.trim()) {
      Alert.alert('Add Text', 'Please write something in your journal entry.');
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood: selectedMood,
      text: entryText.trim(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }

    setShowCompose(false);
    setSelectedMood('');
    setEntryText('');
  }

  async function deleteEntry(id: string) {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = entries.filter((e) => e.id !== id);
          setEntries(updated);
          try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch (error) {
            console.error('Error deleting entry:', error);
          }
        },
      },
    ]);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (entryDate.getTime() === today.getTime()) return `Today at ${timeStr}`;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (entryDate.getTime() === yesterday.getTime()) return `Yesterday at ${timeStr}`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + ` at ${timeStr}`;
  }

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <Card variant="default" padding="md" style={styles.entryCard}>
      <Pressable onLongPress={() => deleteEntry(item.id)}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryMood}>{item.mood}</Text>
          <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.entryText}>{item.text}</Text>
      </Pressable>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Journal', headerBackTitle: 'Back' }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {showCompose ? (
          <View style={styles.composeContainer}>
            <Text style={styles.composeTitle}>How are you feeling?</Text>
            <View style={styles.moodRow}>
              {MOODS.map((mood) => (
                <Pressable
                  key={mood.label}
                  style={[
                    styles.moodChip,
                    selectedMood === mood.emoji && styles.moodChipSelected,
                  ]}
                  onPress={() => setSelectedMood(mood.emoji)}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text
                    style={[
                      styles.moodLabel,
                      selectedMood === mood.emoji && styles.moodLabelSelected,
                    ]}
                  >
                    {mood.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.composeInput}
              value={entryText}
              onChangeText={setEntryText}
              placeholder="Write about your day, thoughts, or feelings..."
              placeholderTextColor={colors.text.secondary}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.composeActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowCompose(false);
                  setSelectedMood('');
                  setEntryText('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveEntryButton} onPress={saveEntry}>
                <Text style={styles.saveEntryText}>Save Entry</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <FlatList
              data={entries}
              renderItem={renderEntry}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📝</Text>
                  <Text style={styles.emptyText}>Your journal is empty</Text>
                  <Text style={styles.emptySubtext}>
                    Start writing to track your thoughts and feelings
                  </Text>
                </View>
              }
            />
            <View style={styles.fabContainer}>
              <Pressable style={styles.fab} onPress={() => setShowCompose(true)}>
                <PlusIcon size={28} color={colors.white} />
              </Pressable>
            </View>
          </>
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
  flex: {
    flex: 1,
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  entryCard: {
    marginBottom: spacing[3],
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  entryMood: {
    fontSize: 24,
  },
  entryDate: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  entryText: {
    ...typography.caregiver.body,
    color: colors.text.primary,
    lineHeight: 22,
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
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: roleColors.caregiver,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  composeContainer: {
    flex: 1,
    padding: spacing[4],
  },
  composeTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  moodChip: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2.5],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
  },
  moodChipSelected: {
    backgroundColor: roleColors.caregiver + '20',
    borderWidth: 2,
    borderColor: roleColors.caregiver,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: spacing[1],
  },
  moodLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  moodLabelSelected: {
    color: roleColors.caregiver,
    fontWeight: '600',
  },
  composeInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...typography.caregiver.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[4],
  },
  composeActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  cancelText: {
    ...typography.caregiver.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  saveEntryButton: {
    flex: 2,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: roleColors.caregiver,
    alignItems: 'center',
  },
  saveEntryText: {
    ...typography.caregiver.body,
    color: colors.white,
    fontWeight: '600',
  },
});
