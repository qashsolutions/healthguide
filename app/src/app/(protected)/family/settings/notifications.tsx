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
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';

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
          <Text style={styles.loadingText}>Loading...</Text>
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
              trackColor={{ false: colors.neutral[300], true: colors.info[300] }}
              thumbColor={preferences.check_in ? roleColors.family : colors.neutral[100]}
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
              trackColor={{ false: colors.neutral[300], true: colors.info[300] }}
              thumbColor={preferences.check_out ? roleColors.family : colors.neutral[100]}
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
              trackColor={{ false: colors.neutral[300], true: colors.info[300] }}
              thumbColor={preferences.daily_report ? roleColors.family : colors.neutral[100]}
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
                  trackColor={{ false: colors.neutral[300], true: colors.info[300] }}
                  thumbColor={preferences.include_observations ? roleColors.family : colors.neutral[100]}
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
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    padding: layout.screenPadding,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  title: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  description: {
    ...typography.styles.body,
    color: colors.text.tertiary,
    marginBottom: layout.sectionGap,
    lineHeight: 22,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: layout.screenPadding,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  sectionTitle: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: layout.screenPadding,
    paddingBottom: spacing[2],
    backgroundColor: colors.neutral[50],
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: layout.screenPadding,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  optionInfo: {
    flex: 1,
    marginRight: layout.screenPadding,
  },
  optionLabel: {
    ...typography.styles.body,
    fontWeight: '500',
    color: colors.text.primary,
  },
  optionDescription: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  subOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: layout.screenPadding,
    paddingLeft: spacing[8],
    backgroundColor: colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  subOptionLabel: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.lg,
    padding: layout.screenPadding,
    marginBottom: layout.sectionGap,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing[3],
  },
  infoText: {
    flex: 1,
    ...typography.styles.bodySmall,
    color: colors.info[800],
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: spacing[8],
  },
});
