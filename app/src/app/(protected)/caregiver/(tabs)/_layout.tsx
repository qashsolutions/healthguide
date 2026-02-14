// HealthGuide Caregiver Tab Navigation
// Per healthguide-core/navigation skill - Large touch targets, icon-first

import { Tabs } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { touchTargets } from '@/theme/spacing';
import { TodayIcon, CalendarIcon, CommunityIcon, ProfileIcon } from '@/components/icons';

export default function CaregiverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: roleColors.caregiver,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          height: touchTargets.caregiver + 16, // Extra tall for easy tapping
          paddingBottom: 12,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral[200],
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        headerShown: false, // Minimal UI for caregivers
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TodayIcon color={color} size={32} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Week',
          tabBarIcon: ({ color }) => <CalendarIcon color={color} size={32} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Support',
          tabBarIcon: ({ color }) => <CommunityIcon color={color} size={32} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} size={32} />,
        }}
      />
    </Tabs>
  );
}
