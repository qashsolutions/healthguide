// HealthGuide Elder/Careseeker Tab Navigation
// Per healthguide-core/navigation skill - Extra large, simplified UI

import { Tabs } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { touchTargets } from '@/theme/spacing';
import { TodayIcon, HeartIcon, PhoneIcon } from '@/components/icons';

export default function CareseekerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: roleColors.careseeker,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          height: touchTargets.elder + 20, // Extra large for elders
          paddingBottom: 16,
          paddingTop: 12,
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral[200],
        },
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        headerShown: false, // Simple UI for elders
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TodayIcon color={color} size={40} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color }) => <HeartIcon color={color} size={40} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Family',
          tabBarIcon: ({ color }) => <PhoneIcon color={color} size={40} />,
        }}
      />
    </Tabs>
  );
}
