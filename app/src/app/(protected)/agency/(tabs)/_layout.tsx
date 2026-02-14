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

export default function AgencyTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: roleColors.agency_owner,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral[200],
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
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
