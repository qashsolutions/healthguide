// HealthGuide Caregiver Tab Navigation
// Per healthguide-core/navigation skill - Large touch targets, icon-first

import { Tabs } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { touchTargets } from '@/theme/spacing';
import { TodayIcon, CalendarIcon, CommunityIcon, ProfileIcon } from '@/components/icons';
import { createFloatingTabBar } from '@/components/ui/FloatingTabBar';

const FloatingTabBar = createFloatingTabBar({
  roleColor: roleColors.caregiver,
  tabHeight: touchTargets.caregiver + 16,
  iconSize: 32,
  labelSize: 14,
});

export default function CaregiverTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={{
        tabBarActiveTintColor: roleColors.caregiver,
        tabBarInactiveTintColor: colors.neutral[400],
        headerShown: false,
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
