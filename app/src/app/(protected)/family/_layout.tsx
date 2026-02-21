// HealthGuide Family Layout
// Tab navigation for family member app

import { Tabs } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { HomeIcon, CalendarIcon, FileTextIcon, SettingsIcon } from '@/components/icons';
import { createFloatingTabBar } from '@/components/ui/FloatingTabBar';

const FloatingTabBar = createFloatingTabBar({
  roleColor: roleColors.family,
  tabHeight: 60,
});

export default function FamilyLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        headerShown: false,
        tabBarActiveTintColor: roleColors.family,
        tabBarInactiveTintColor: colors.neutral[400],
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visits',
          tabBarIcon: ({ color }) => <CalendarIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <FileTextIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
      {/* Hide sub-routes from tab bar */}
      <Tabs.Screen name="find-companion" options={{ href: null }} />
      <Tabs.Screen name="settings/profile" options={{ href: null }} />
      <Tabs.Screen name="settings/notifications" options={{ href: null }} />
      <Tabs.Screen name="visit/[id]" options={{ href: null }} />
      <Tabs.Screen name="report/[id]" options={{ href: null }} />
    </Tabs>
  );
}
