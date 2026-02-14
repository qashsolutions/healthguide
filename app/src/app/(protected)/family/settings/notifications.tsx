// HealthGuide Family Notification Settings Screen
// Configure push notification preferences

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { TimePicker } from '@/components/ui/TimePicker';

interface NotificationPreferences {
  check_in: boolean;
  check_out: boolean;
  daily_report: boolean;
  delivery_time: string;
  timezone: string;
  include_observations: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  check_in: true,
  check_out: true,
  daily_report: true,
  delivery_time: '19:00',
  timezone: 'America/New_York',
  include_observations: true,
};

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('family_members')
      .select('notification_preferences')
      .eq('user_id', user.id)
      .single();

    if (data?.notification_preferences) {
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...data.notification_preferences,
      });
    }

    setLoading(false);
  }

  function updatePreference<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function savePreferences() {
    if (!user?.id) return;

    setSaving(true);

    const { error } = await supabase
      .from('family_members')
      .update({ notification_preferences: preferences })
      .eq('user_id', user.id);

    if (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } else {
      Alert.alert('Success', 'Notification preferences saved!');
      setHasChanges(false);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.description}>
          Choose which notifications you'd like to receive about your loved one's care.
        </Text>

        {/* Visit Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Alerts</Text>

          <View style={styles.option}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Caregiver Arrival</Text>
              <Text style={styles.optionDescription}>
                Get notified when a caregiver checks in
              </Text>
            </View>
            <Switch
              value={preferences.check_in}
              onValueChange={(val) => updatePreference('check_in', val)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.check_in ? '#3B82F6' : '#F3F4F6'}
            />
          </View>

          <View style={styles.option}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Visit Completed</Text>
              <Text style={styles.optionDescription}>
                Get notified with visit summary when caregiver checks out
              </Text>
            </View>
            <Switch
              value={preferences.check_out}
              onValueChange={(val) => updatePreference('check_out', val)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.check_out ? '#3B82F6' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Daily Reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reports</Text>

          <View style={styles.option}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Daily Care Summary</Text>
              <Text style={styles.optionDescription}>
                Receive a daily summary of all care activities
              </Text>
            </View>
            <Switch
              value={preferences.daily_report}
              onValueChange={(val) => updatePreference('daily_report', val)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.daily_report ? '#3B82F6' : '#F3F4F6'}
            />
          </View>

          {preferences.daily_report && (
            <>
              <View style={styles.subOption}>
                <Text style={styles.subOptionLabel}>Delivery Time</Text>
                <TimePicker
                  value={preferences.delivery_time}
                  onChange={(time) => updatePreference('delivery_time', time)}
                />
              </View>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Include Caregiver Notes</Text>
                  <Text style={styles.optionDescription}>
                    Show observations and notes from caregivers
                  </Text>
                </View>
                <Switch
                  value={preferences.include_observations}
                  onValueChange={(val) => updatePreference('include_observations', val)}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={preferences.include_observations ? '#3B82F6' : '#F3F4F6'}
                />
              </View>
            </>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            All notifications are delivered as push notifications to this device.
            Make sure notifications are enabled in your device settings.
          </Text>
        </View>

        {/* Save Button */}
        <Button
          title="Save Preferences"
          onPress={savePreferences}
          loading={saving}
          disabled={!hasChanges}
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  subOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 32,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  subOptionLabel: {
    fontSize: 14,
    color: '#374151',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: 32,
  },
});
