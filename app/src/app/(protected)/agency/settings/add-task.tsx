// HealthGuide Add Custom Task
// Per healthguide-agency/task-library skill

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Card } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { CheckIcon } from '@/components/icons';
import { TaskCategory, CATEGORY_LABELS } from '@/data/defaultTasks';

const CATEGORIES: TaskCategory[] = [
  'companionship',
  'household',
  'nutrition',
  'mobility',
  'personal_care',
  'health',
  'errands',
  'other',
];

export default function AddTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other' as TaskCategory,
    requires_license: false,
    estimated_duration_minutes: '',
    is_active: true,
  });

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Task name is required');
      return;
    }

    if (!form.description.trim()) {
      Alert.alert('Error', 'Task description is required');
      return;
    }

    setSaving(true);
    try {
      // Get the highest sort_order for this category
      const { data: existingTasks } = await supabase
        .from('task_definitions')
        .select('sort_order')
        .eq('agency_id', user?.agency_id)
        .eq('category', form.category)
        .order('sort_order', { ascending: false })
        .limit(1);

      const lastSortOrder = existingTasks?.[0]?.sort_order ?? 0;

      const { error } = await supabase.from('task_definitions').insert({
        agency_id: user?.agency_id,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        icon_name: 'custom', // Default icon for custom tasks
        requires_license: form.requires_license,
        estimated_duration_minutes: form.estimated_duration_minutes
          ? parseInt(form.estimated_duration_minutes, 10)
          : null,
        is_active: form.is_active,
        sort_order: lastSortOrder + 1,
      });

      if (error) throw error;

      Alert.alert('Success', 'Task added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'Could not save task');
    }
    setSaving(false);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Custom Task',
          headerBackTitle: 'Cancel',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Basic Info */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Task Information</Text>

            <Input
              label="Task Name"
              value={form.name}
              onChangeText={(text: string) => setForm({ ...form, name: text })}
              placeholder="e.g., Technology Assistance"
            />

            <Input
              label="Description"
              value={form.description}
              onChangeText={(text: string) => setForm({ ...form, description: text })}
              placeholder="What does this task involve?"
              multiline
              numberOfLines={3}
            />

            <Input
              label="Estimated Duration (minutes)"
              value={form.estimated_duration_minutes}
              onChangeText={(text: string) => setForm({ ...form, estimated_duration_minutes: text })}
              placeholder="e.g., 30"
              keyboardType="numeric"
            />
          </Card>

          {/* Category Selection */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.sectionSubtitle}>
              Select the category that best fits this task
            </Text>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => {
                const isSelected = form.category === category;

                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setForm({ ...form, category })}
                  >
                    {isSelected && <CheckIcon size={14} color={colors.white} />}
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {CATEGORY_LABELS[category]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Settings */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Requires License</Text>
                <Text style={styles.switchHint}>
                  Only licensed caregivers can perform this task
                </Text>
              </View>
              <Switch
                value={form.requires_license}
                onValueChange={(value) => setForm({ ...form, requires_license: value })}
                trackColor={{ false: colors.neutral[200], true: colors.warning[300] }}
                thumbColor={form.requires_license ? colors.warning[500] : colors.neutral[400]}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Active</Text>
                <Text style={styles.switchHint}>
                  Careseekers can select this task
                </Text>
              </View>
              <Switch
                value={form.is_active}
                onValueChange={(value) => setForm({ ...form, is_active: value })}
                trackColor={{ false: colors.neutral[200], true: colors.primary[300] }}
                thumbColor={form.is_active ? colors.primary[500] : colors.neutral[400]}
              />
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Add Task"
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  sectionSubtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  categoryChipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  categoryText: {
    ...typography.styles.caption,
    color: colors.text.primary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  switchLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  switchHint: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[2],
  },
  actions: {
    marginTop: spacing[4],
    marginBottom: spacing[8],
  },
});
