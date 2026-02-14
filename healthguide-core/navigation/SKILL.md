---
name: healthguide-core-navigation
description: Role-specific navigation flows for HealthGuide elder care app. Implements Expo Router with distinct navigation stacks for agency owners, caregivers, and careseekers. Use when setting up app navigation, tab bars, role-based routing, or deep linking.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [navigation, expo-router, tabs, roles]
---

# HealthGuide Core Navigation

## Overview
Each user role has a completely different navigation experience optimized for their workflow. Agency owners get a full management dashboard, caregivers get a minimal visual interface, and careseekers get a passive view.

## Navigation Architecture by Role

### Agency Owner Navigation
```
├── (tabs)
│   ├── dashboard/        # Weekly/monthly overview
│   ├── caregivers/       # Manage caregivers (up to 15)
│   ├── careseekers/      # Manage elders + family contacts
│   ├── scheduling/       # Slot publishing, assignments
│   └── settings/         # Agency settings, payments
├── caregiver/[id]        # Individual caregiver detail
├── careseeker/[id]       # Individual careseeker detail
└── assignment/[id]       # Assignment detail
```

### Caregiver Navigation (Minimal - Icon-Based)
```
├── (tabs)
│   ├── today/            # Today's assignments (main screen)
│   ├── schedule/         # Week view
│   ├── community/        # Caregiver support groups
│   └── profile/          # Simple profile
├── visit/[id]            # Active visit screen
│   ├── check-in          # EVV check-in
│   ├── tasks             # Task completion (tap icons)
│   ├── notes             # Observations (icons + voice)
│   └── check-out         # EVV check-out
├── community/
│   ├── groups/           # Support group list
│   ├── groups/[id]       # Group forum
│   ├── posts/[id]        # Post detail + replies
│   └── wellness/         # Wellness check-in
```

### Careseeker/Elder Navigation (Simplified UI)
```
├── (tabs)
│   ├── home/             # Large buttons: Call Family, Activities
│   ├── activities/       # Games, music, videos
│   └── calls/            # Family video contacts
├── games/
│   ├── memory            # Memory card game
│   ├── trivia            # Simple trivia
│   └── word              # Word games
├── daily-check-in/       # Morning mood check-in
├── video-call/[id]       # Start video call with family
```

### Volunteer Navigation
```
├── (tabs)
│   ├── matches/          # Elder matches
│   ├── visits/           # Scheduled visits
│   └── profile/          # Volunteer profile
├── schedule-visit/[elderId]  # Book a visit
├── visit/[id]            # Active volunteer visit
```

## Instructions

### Step 1: App Layout Structure

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="(auth)" />
      ) : (
        <Stack.Screen name="(protected)" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
```

### Step 2: Role-Based Tab Layout

```typescript
// app/(protected)/_layout.tsx
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AgencyTabs } from '@/components/navigation/AgencyTabs';
import { CaregiverTabs } from '@/components/navigation/CaregiverTabs';
import { CareseekerTabs } from '@/components/navigation/CareseekerTabs';

export default function ProtectedLayout() {
  const { role } = useAuth();

  switch (role) {
    case 'agency_owner':
      return <AgencyTabs />;
    case 'caregiver':
      return <CaregiverTabs />;
    case 'careseeker':
      return <CareseekerTabs />;
    default:
      return <Redirect href="/login" />;
  }
}
```

### Step 3: Agency Owner Tabs

```typescript
// components/navigation/AgencyTabs.tsx
import { Tabs } from 'expo-router';
import { DashboardIcon, UsersIcon, CalendarIcon, SettingsIcon } from '@/components/icons';

export function AgencyTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <DashboardIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="caregivers"
        options={{
          title: 'Caregivers',
          tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="careseekers"
        options={{
          title: 'Elders',
          tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scheduling"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <CalendarIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

### Step 4: Caregiver Tabs (Large Touch Targets)

```typescript
// components/navigation/CaregiverTabs.tsx
import { Tabs } from 'expo-router';
import { TodayIcon, CalendarIcon, ProfileIcon } from '@/components/icons';

export function CaregiverTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 80, // Larger for easy tapping
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        headerShown: false, // Minimal UI
      }}
    >
      <Tabs.Screen
        name="today"
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
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} size={32} />,
        }}
      />
    </Tabs>
  );
}
```

### Step 5: Visit Flow Navigation (Caregiver)

```typescript
// app/(protected)/caregiver/visit/[id]/_layout.tsx
import { Stack } from 'expo-router';

export default function VisitLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent accidental back during visit
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="check-in" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="check-out" />
    </Stack>
  );
}
```

## Deep Linking Configuration

```typescript
// app.json
{
  "expo": {
    "scheme": "healthguide",
    "plugins": [
      [
        "expo-router",
        {
          "root": "./src/app"
        }
      ]
    ]
  }
}
```

### Deep Link Examples
- `healthguide://visit/123/check-in` - Open check-in for visit
- `healthguide://careseeker/456` - Open careseeker detail
- `healthguide://dashboard` - Open agency dashboard

## File Structure

```
src/app/
├── _layout.tsx                    # Root layout
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
└── (protected)/
    ├── _layout.tsx                # Role-based tab selector
    ├── agency/
    │   ├── (tabs)/
    │   │   ├── _layout.tsx
    │   │   ├── dashboard.tsx
    │   │   ├── caregivers.tsx
    │   │   ├── careseekers.tsx
    │   │   ├── scheduling.tsx
    │   │   └── settings.tsx
    │   ├── caregiver/[id].tsx
    │   └── careseeker/[id].tsx
    ├── caregiver/
    │   ├── (tabs)/
    │   │   ├── _layout.tsx
    │   │   ├── today.tsx
    │   │   ├── schedule.tsx
    │   │   └── profile.tsx
    │   └── visit/[id]/
    │       ├── _layout.tsx
    │       ├── check-in.tsx
    │       ├── tasks.tsx
    │       ├── notes.tsx
    │       └── check-out.tsx
    └── careseeker/
        └── (tabs)/
            ├── _layout.tsx
            ├── home.tsx
            ├── tasks.tsx
            └── history.tsx
```

## Troubleshooting

### Error: Tab bar not showing correct icons
**Cause:** Role not properly loaded before rendering
**Solution:** Add loading state check before rendering tabs

### Error: Deep links not working
**Cause:** Scheme not configured or app not handling URL
**Solution:** Verify `scheme` in app.json and test with `npx uri-scheme open`
