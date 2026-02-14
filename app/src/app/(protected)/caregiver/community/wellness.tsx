// HealthGuide Caregiver Wellness Check-in
// Daily check-in with mood/energy/stress sliders and history view

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface WellnessLog {
  id: string;
  date: string;
  mood: number;
  energy: number;
  stress: number;
  notes: string | null;
}

const SCALE_LABELS: Record<string, string[]> = {
  mood: ['Very Low', 'Low', 'Okay', 'Good', 'Great'],
  energy: ['Exhausted', 'Tired', 'Moderate', 'Energized', 'Full Energy'],
  stress: ['Minimal', 'Low', 'Moderate', 'High', 'Overwhelmed'],
};

const SCALE_EMOJIS: Record<string, string[]> = {
  mood: ['😢', '😔', '😐', '🙂', '😊'],
  energy: ['🔋', '🪫', '⚡', '💪', '🔥'],
  stress: ['😌', '🧘', '😤', '😰', '🆘'],
};

export default function WellnessScreen() {
  const { user } = useAuth();
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayLogged, setTodayLogged] = useState(false);
  const [history, setHistory] = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    if (!user?.id) return;

    try {
      // Check if today is already logged
      const today = new Date().toISOString().split('T')[0];
      const { data: todayLog } = await supabase
        .from('caregiver_wellness_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (todayLog) {
        setTodayLogged(true);
        setMood(todayLog.mood);
        setEnergy(todayLog.energy);
        setStress(todayLog.stress);
        setNotes(todayLog.notes || '');
      }

      // Fetch recent history
      const { data: logs, error } = await supabase
        .from('caregiver_wellness_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(14);

      if (error) throw error;
      setHistory(logs || []);
    } catch (error) {
      console.error('Error loading wellness data:', error);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!user?.id) return;

    setSaving(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('caregiver_wellness_logs')
        .upsert({
          user_id: user.id,
          date: today,
          mood,
          energy,
          stress,
          notes: notes.trim() || null,
        }, {
          onConflict: 'user_id,date',
        });

      if (error) throw error;

      setTodayLogged(true);
      Alert.alert('Saved', 'Your wellness check-in has been recorded.');
      await loadData();
    } catch (error) {
      console.error('Error saving wellness log:', error);
      Alert.alert('Error', 'Failed to save check-in. Please try again.');
    }

    setSaving(false);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function ScaleSelector({
    label,
    category,
    value,
    onChange,
  }: {
    label: string;
    category: string;
    value: number;
    onChange: (v: number) => void;
  }) {
    return (
      <View style={styles.scaleSection}>
        <Text style={styles.scaleLabel}>{label}</Text>
        <View style={styles.scaleRow}>
          {[1, 2, 3, 4, 5].map((level) => (
            <Pressable
              key={level}
              style={[
                styles.scaleButton,
                value === level && styles.scaleButtonSelected,
              ]}
              onPress={() => onChange(level)}
            >
              <Text style={styles.scaleEmoji}>
                {SCALE_EMOJIS[category][level - 1]}
              </Text>
              <Text
                style={[
                  styles.scaleText,
                  value === level && styles.scaleTextSelected,
                ]}
              >
                {level}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.scaleDescription}>
          {SCALE_LABELS[category][value - 1]}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Wellness Check-in', headerBackTitle: 'Back' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={roleColors.caregiver} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Wellness Check-in', headerBackTitle: 'Back' }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Check-in Card */}
        <Card variant="elevated" padding="lg" style={styles.checkinCard}>
          <Text style={styles.checkinTitle}>
            {todayLogged ? 'Update Today\'s Check-in' : 'Daily Check-in'}
          </Text>
          <Text style={styles.checkinSubtitle}>
            How are you feeling today?
          </Text>

          <ScaleSelector
            label="Mood"
            category="mood"
            value={mood}
            onChange={setMood}
          />
          <ScaleSelector
            label="Energy"
            category="energy"
            value={energy}
            onChange={setEnergy}
          />
          <ScaleSelector
            label="Stress"
            category="stress"
            value={stress}
            onChange={setStress}
          />

          <View style={styles.notesSection}>
            <Text style={styles.scaleLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any thoughts you'd like to capture..."
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveText}>
                {todayLogged ? 'Update Check-in' : 'Save Check-in'}
              </Text>
            )}
          </Pressable>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent History</Text>
            {history.map((log) => (
              <Card key={log.id} variant="default" padding="md" style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{formatDate(log.date)}</Text>
                  <View style={styles.historyEmojis}>
                    <Text>{SCALE_EMOJIS.mood[log.mood - 1]}</Text>
                    <Text>{SCALE_EMOJIS.energy[log.energy - 1]}</Text>
                    <Text>{SCALE_EMOJIS.stress[log.stress - 1]}</Text>
                  </View>
                </View>
                <View style={styles.historyScores}>
                  <Text style={styles.historyScore}>
                    Mood: {log.mood}/5
                  </Text>
                  <Text style={styles.historyScore}>
                    Energy: {log.energy}/5
                  </Text>
                  <Text style={styles.historyScore}>
                    Stress: {log.stress}/5
                  </Text>
                </View>
                {log.notes && (
                  <Text style={styles.historyNotes} numberOfLines={2}>
                    {log.notes}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  checkinCard: {
    marginBottom: spacing[6],
  },
  checkinTitle: {
    ...typography.caregiver.heading,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  checkinSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[5],
  },
  scaleSection: {
    marginBottom: spacing[5],
  },
  scaleLabel: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  scaleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  scaleButtonSelected: {
    backgroundColor: roleColors.caregiver + '20',
    borderWidth: 2,
    borderColor: roleColors.caregiver,
  },
  scaleEmoji: {
    fontSize: 22,
    marginBottom: spacing[0.5],
  },
  scaleText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  scaleTextSelected: {
    color: roleColors.caregiver,
  },
  scaleDescription: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  notesSection: {
    marginBottom: spacing[4],
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...typography.caregiver.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    minHeight: 80,
  },
  saveButton: {
    backgroundColor: roleColors.caregiver,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    ...typography.caregiver.body,
    color: colors.white,
    fontWeight: '600',
  },
  historySection: {
    marginTop: spacing[2],
  },
  historyTitle: {
    ...typography.caregiver.label,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  historyCard: {
    marginBottom: spacing[2],
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  historyDate: {
    ...typography.styles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  historyEmojis: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  historyScores: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[1],
  },
  historyScore: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  historyNotes: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
});
