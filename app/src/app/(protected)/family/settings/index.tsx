// HealthGuide Family Settings Screen
// Settings menu for family members

import { View, Text, StyleSheet, Pressable, Alert, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { removeDeviceToken } from '@/lib/notifications';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, layout } from '@/theme/spacing';
import {
  BellIcon,
  ProfileIcon,
  HelpIcon,
  LogOutIcon,
  ChevronRightIcon,
} from '@/components/icons';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingsItem({ icon, label, onPress, destructive = false }: SettingsItemProps) {
  return (
    <Pressable style={styles.settingsItem} onPress={onPress}>
      <View style={styles.itemLeft}>
        {icon}
        <Text style={[styles.itemLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
      </View>
      <ChevronRightIcon color={colors.neutral[400]} size={20} />
    </Pressable>
  );
}

export default function FamilySettingsScreen() {
  const { user } = useAuth();

  async function handleLogout() {
    const doLogout = async () => {
      try {
        if (user?.id) {
          await removeDeviceToken(user.id);
        }
        await supabase.auth.signOut();
        router.replace('/');
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        await doLogout();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.titleText}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon={<BellIcon color={colors.text.primary} />}
              label="Notification Settings"
              onPress={() => router.push('/family/settings/notifications')}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon={<ProfileIcon color={colors.text.primary} />}
              label="Profile"
              onPress={() => router.push('/family/settings/profile' as any)}
            />
            <SettingsItem
              icon={<HelpIcon color={colors.text.primary} />}
              label="Help & Support"
              onPress={() => Linking.openURL('mailto:support@healthguide.app')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon={<LogOutIcon color={colors.error[500]} />}
              label="Log Out"
              onPress={handleLogout}
              destructive
            />
          </View>
        </View>

        {/* Version */}
        <View style={styles.version}>
          <Text style={styles.versionText}>HealthGuide Family v1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.screenPadding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[2],
    marginRight: spacing[2],
  },
  backText: {
    ...typography.styles.body,
    color: roleColors.family,
  },
  titleText: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: layout.screenPadding,
  },
  section: {
    marginBottom: layout.sectionGap,
  },
  sectionTitle: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  itemLabel: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  destructiveText: {
    color: colors.error[500],
  },
  version: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: layout.sectionGap,
  },
  versionText: {
    ...typography.styles.bodySmall,
    color: colors.neutral[400],
  },
});
