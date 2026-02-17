// HealthGuide Agency Owner Tab Navigation
// Per healthguide-core/navigation skill

import { Tabs } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import {
  DashboardIcon,
  UsersIcon,
  PersonIcon,
  CalendarIcon,
  SettingsIcon,
} from '@/components/icons';
import { createFloatingTabBar } from '@/components/ui/FloatingTabBar';

const FloatingTabBar = createFloatingTabBar({
  roleColor: roleColors.agency_owner,
  tabHeight: 60,
});

export default function AgencyTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={{
        tabBarActiveTintColor: roleColors.agency_owner,
        tabBarInactiveTintColor: colors.neutral[400],
        headerStyle: {
          backgroundColor: roleColors.agency_owner,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'Agency Dashboard',
          tabBarIcon: ({ color, size }) => (
            <DashboardIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="caregivers"
        options={{
          title: 'Caregivers',
          headerTitle: 'Manage Caregivers',
          tabBarIcon: ({ color, size }) => (
            <UsersIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="elders"
        options={{
          title: 'Elders',
          headerTitle: 'Manage Elders',
          tabBarIcon: ({ color, size }) => (
            <PersonIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerTitle: 'Scheduling',
          tabBarIcon: ({ color, size }) => (
            <CalendarIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Agency Settings',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
