// HealthGuide Video Contacts Management
// Per healthguide-community/elder-engagement skill - Agency manages elder's video call contacts

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input, Card } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { PlusIcon, TrashIcon, PhoneIcon } from '@/components/icons';

interface VideoContact {
  id: string;
  name: string;
  relationship: string;
  video_call_link: string;
  is_favorite: boolean;
}

interface ContactForm {
  name: string;
  relationship: string;
  video_call_link: string;
}

const EMPTY_FORM: ContactForm = { name: '', relationship: '', video_call_link: '' };

export default function VideoContactsScreen() {
  const { elder_id, elder_name } = useLocalSearchParams<{ elder_id: string; elder_name: string }>();
  const router = useRouter();
  const [contacts, setContacts] = useState<VideoContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);

  useEffect(() => {
    if (elder_id) fetchContacts();
  }, [elder_id]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_video_contacts')
        .select('id, name, relationship, video_call_link, is_favorite')
        .eq('elder_id', elder_id)
        .order('is_favorite', { ascending: false })
        .order('name');

      if (!error && data) setContacts(data);
    } catch (err) {
      console.error('Error fetching video contacts:', err);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!form.name || !form.video_call_link) {
      Alert.alert('Error', 'Name and video call link are required');
      return;
    }

    // Basic URL validation
    if (!form.video_call_link.startsWith('http') && !form.video_call_link.startsWith('facetime:')) {
      Alert.alert('Error', 'Please enter a valid link (e.g., https://zoom.us/j/... or facetime:...)');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('family_video_contacts')
          .update({
            name: form.name,
            relationship: form.relationship,
            video_call_link: form.video_call_link,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('family_video_contacts')
          .insert({
            elder_id,
            name: form.name,
            relationship: form.relationship,
            video_call_link: form.video_call_link,
          });

        if (error) throw error;
      }

      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingId(null);
      await fetchContacts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save contact');
    }
    setSaving(false);
  }

  async function handleDelete(contactId: string) {
    Alert.alert('Delete Contact', 'Are you sure you want to remove this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('family_video_contacts')
              .delete()
              .eq('id', contactId);

            if (error) throw error;
            await fetchContacts();
          } catch (err) {
            Alert.alert('Error', 'Could not delete contact');
          }
        },
      },
    ]);
  }

  function startEdit(contact: VideoContact) {
    setForm({
      name: contact.name,
      relationship: contact.relationship,
      video_call_link: contact.video_call_link,
    });
    setEditingId(contact.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Video Contacts',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>
            Manage video call contacts for {elder_name || 'this elder'}
          </Text>

          {/* Contact List */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <>
              {contacts.map((contact) => (
                <Card key={contact.id} style={styles.contactCard}>
                  <Pressable
                    style={styles.contactRow}
                    onPress={() => startEdit(contact)}
                  >
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.relationship ? (
                        <Text style={styles.contactRelation}>{contact.relationship}</Text>
                      ) : null}
                      <Text style={styles.contactLink} numberOfLines={1}>
                        {contact.video_call_link}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(contact.id)}
                    >
                      <TrashIcon size={20} color={colors.error[500]} />
                    </Pressable>
                  </Pressable>
                </Card>
              ))}

              {contacts.length === 0 && !showForm && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No video contacts added yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add FaceTime, Zoom, or WhatsApp links so the elder can call family
                  </Text>
                </View>
              )}

              {contacts.length >= 10 && !showForm && (
                <Text style={styles.limitText}>Maximum of 10 contacts reached</Text>
              )}
            </>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Contact' : 'Add Contact'}
              </Text>

              <Input
                label="Name"
                value={form.name}
                onChangeText={(text: string) => setForm({ ...form, name: text })}
                placeholder="Sarah"
              />

              <Input
                label="Relationship"
                value={form.relationship}
                onChangeText={(text: string) => setForm({ ...form, relationship: text })}
                placeholder="Daughter"
              />

              <Input
                label="Video Call Link"
                value={form.video_call_link}
                onChangeText={(text: string) => setForm({ ...form, video_call_link: text })}
                placeholder="https://zoom.us/j/123456 or facetime:+1234567890"
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="md"
                  onPress={cancelForm}
                />
                <Button
                  title={editingId ? 'Save Changes' : 'Add Contact'}
                  variant="primary"
                  size="md"
                  onPress={handleSave}
                  loading={saving}
                />
              </View>
            </Card>
          )}

          {/* Add Button */}
          {!showForm && contacts.length < 10 && (
            <Button
              title="Add Video Contact"
              variant="primary"
              size="lg"
              icon={<PlusIcon size={20} color={colors.white} />}
              onPress={() => setShowForm(true)}
              fullWidth
            />
          )}
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
  content: {
    padding: spacing[4],
    gap: spacing[3],
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  loader: {
    marginVertical: spacing[8],
  },
  contactCard: {
    padding: spacing[3],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  contactRelation: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  contactLink: {
    ...typography.styles.caption,
    color: colors.primary[500],
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  emptyText: {
    ...typography.styles.label,
    color: colors.text.secondary,
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  limitText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  formCard: {
    padding: spacing[4],
  },
  formTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
});
