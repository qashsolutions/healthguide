// HealthGuide Elder/Careseeker Tab Navigation
// Per healthguide-core/navigation skill - Extra large, simplified UI

import { Tabs } from 'expo-router';
import { colors, roleColors } from '@/theme/colors';
import { touchTargets } from '@/theme/spacing';
import { TodayIcon, HeartIcon, PhoneIcon } from '@/components/icons';
import { createFloatingTabBar } from '@/components/ui/FloatingTabBar';

const FloatingTabBar = createFloatingTabBar({
  roleColor: roleColors.careseeker,
  tabHeight: touchTargets.elder + 20,
  iconSize: 40,
  labelSize: 16,
});

export default function CareseekerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: roleColors.careseeker,
        tabBarInactiveTintColor: colors.neutral[400],
        headerShown: false,
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
