// HealthGuide Agency Settings
// Per healthguide-agency skills

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, shadows } from '@/theme/spacing';
import { ChevronRightIcon, CheckIcon, SettingsIcon, BellIcon } from '@/components/icons';

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: 'task-library',
    title: 'Task Library',
    description: 'Manage care services your agency offers',
    route: '/(protected)/agency/settings/task-library',
    icon: <CheckIcon size={24} color={colors.primary[500]} />,
  },
  {
    id: 'agency-profile',
    title: 'Agency Profile',
    description: 'Update agency name, contact info, and branding',
    route: '/(protected)/agency/settings/profile',
    icon: <SettingsIcon size={24} color={colors.primary[500]} />,
  },
  {
    id: 'notifications',
    title: 'Notification Settings',
    description: 'Configure alerts and notification preferences',
    route: '/(protected)/agency/settings/notifications',
    icon: <BellIcon size={24} color={colors.primary[500]} />,
  },
];

export default function AgencySettingsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {SETTINGS_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              style={styles.settingsItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.iconContainer}>{item.icon}</View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.text.secondary} />
            </Pressable>
          ))}
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
    gap: spacing[3],
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[4],
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemDescription: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
});
