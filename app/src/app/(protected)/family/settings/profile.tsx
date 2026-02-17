// HealthGuide Family Profile Settings
// Edit screen for family member name, phone, relationship

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';

const RELATIONSHIPS = ['son', 'daughter', 'spouse', 'sibling', 'other'];

export default function FamilyProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('name, phone, relationship')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || '');
        setPhone(data.phone || '');
        setRelationship(data.relationship || '');
      }
    } catch (error) {
      console.error('Error fetching family profile:', error);
      // Prefill from user profile
      setName(user.full_name || '');
      setPhone(user.phone || '');
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    if (!relationship) {
      Alert.alert('Required', 'Please select your relationship.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          relationship,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Profile', headerBackTitle: 'Back' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={roleColors.family} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Profile', headerBackTitle: 'Back' }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.neutral[400]}
            autoCapitalize="words"
          />
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.neutral[400]}
            keyboardType="phone-pad"
          />
        </View>

        {/* Relationship */}
        <View style={styles.field}>
          <Text style={styles.label}>Relationship</Text>
          <View style={styles.relationshipOptions}>
            {RELATIONSHIPS.map((rel) => (
              <Pressable
                key={rel}
                style={[
                  styles.relationshipChip,
                  relationship === rel && styles.relationshipChipSelected,
                ]}
                onPress={() => setRelationship(rel)}
              >
                <Text
                  style={[
                    styles.relationshipText,
                    relationship === rel && styles.relationshipTextSelected,
                  ]}
                >
                  {rel.charAt(0).toUpperCase() + rel.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
    marginTop: spacing[4],
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: roleColors.family,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.styles.h1,
    color: colors.white,
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: layout.screenPadding,
    ...typography.styles.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  relationshipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  relationshipChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  relationshipChipSelected: {
    backgroundColor: roleColors.family,
    borderColor: roleColors.family,
  },
  relationshipText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  relationshipTextSelected: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: roleColors.family,
    borderRadius: borderRadius.lg,
    paddingVertical: layout.screenPadding,
    alignItems: 'center',
    marginTop: spacing[4],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.styles.button,
    color: colors.white,
  },
});
