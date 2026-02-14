---
name: healthguide-notifications-fcm
description: Expo Push Notifications for caregivers, agency owners, AND family members. All users receive push notifications via the app - family members MUST install the app to receive care updates. Handles device token registration, notification delivery, and in-app notification center. Use when building push notification setup, notification handlers, or notification centers.
metadata:
  author: HealthGuide
  version: 2.0.0
  category: notifications
  tags: [expo, push, notifications, family]
---

# HealthGuide Push Notifications

## Overview
Push notifications are the PRIMARY notification method for ALL users including family members. Family members must install the HealthGuide app to receive care updates (check-in/out alerts, daily reports). This replaces SMS as the primary delivery method, providing richer notifications at zero cost.

## Notification Recipients

| User Type | Notification Types |
|-----------|-------------------|
| **Caregiver** | Shift reminders, schedule changes, urgent alerts |
| **Agency Owner** | Missed check-ins, task declines, daily summaries |
| **Family Member** | Check-in alerts, check-out summaries, daily reports |

## Key Features

- Device token registration for all user types
- Foreground/background notification handling
- Rich notifications with deep links
- Badge count management
- Notification center with history
- Real-time updates via Supabase subscriptions

## Data Models

```typescript
interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  user_type: 'caregiver' | 'agency_owner' | 'family'; // NEW: user type
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  type: NotificationType;
  read: boolean;
  read_at?: string;
  created_at: string;
}

type NotificationType =
  // Caregiver notifications
  | 'shift_reminder'
  | 'schedule_change'
  // Agency notifications
  | 'missed_checkout'
  | 'task_declined'
  // Family notifications (NEW)
  | 'check_in_alert'
  | 'check_out_alert'
  | 'daily_report'
  | 'urgent_observation'
  // General
  | 'general';

interface NotificationPayload {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
  categoryId?: string; // For actionable notifications
}
```

## Instructions

### Step 1: Expo Notifications Setup (Updated for Family)

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// User types for notification registration
export type NotificationUserType = 'caregiver' | 'agency_owner' | 'family';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications
 * @param userId - The authenticated user's ID
 * @param userType - The type of user (caregiver, agency_owner, or family)
 */
export async function registerForPushNotifications(
  userId: string,
  userType: NotificationUserType = 'caregiver'
): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  const token = tokenData.data;

  // Save token to database with user type
  await saveDeviceToken(userId, token, userType);

  // Configure Android channels
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  return token;
}

async function saveDeviceToken(
  userId: string,
  token: string,
  userType: NotificationUserType
) {
  const platform = Platform.OS as 'ios' | 'android';

  // Upsert token (update if exists, insert if not)
  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        user_type: userType, // NEW: include user type
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,platform',
      }
    );

  if (error) {
    console.error('Failed to save device token:', error);
  }
}

async function setupAndroidChannels() {
  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
  });

  // Shift reminders (caregivers)
  await Notifications.setNotificationChannelAsync('shifts', {
    name: 'Shift Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'shift_reminder.wav',
  });

  // Care updates (family members)
  await Notifications.setNotificationChannelAsync('care_updates', {
    name: 'Care Updates',
    description: 'Check-in/out alerts and daily reports',
    importance: Notifications.AndroidImportance.HIGH,
  });

  // Urgent alerts (all users)
  await Notifications.setNotificationChannelAsync('urgent', {
    name: 'Urgent Alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'urgent.wav',
    vibrationPattern: [0, 500, 200, 500],
  });
}

export async function removeDeviceToken(userId: string) {
  const platform = Platform.OS;

  await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform);
}
```

### Step 2: Notification Context (Updated)

```typescript
// contexts/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { registerForPushNotifications, NotificationUserType } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (user) {
      // Determine user type for token registration
      const userType = getUserType(user.role);

      // Register for push notifications
      registerForPushNotifications(user.id, userType);

      // Fetch initial unread count
      refreshUnreadCount();

      // Listen for incoming notifications (foreground)
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          refreshUnreadCount();
        }
      );

      // Listen for notification interactions (tap)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handleNotificationResponse(response);
        }
      );

      // Subscribe to real-time notification updates
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            refreshUnreadCount();
          }
        )
        .subscribe();

      return () => {
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  function getUserType(role: string): NotificationUserType {
    switch (role) {
      case 'agency_owner':
        return 'agency_owner';
      case 'family':
        return 'family';
      default:
        return 'caregiver';
    }
  }

  async function refreshUnreadCount() {
    if (!user) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setUnreadCount(count || 0);
    await Notifications.setBadgeCountAsync(count || 0);
  }

  function handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    const userRole = user?.role;

    // Route based on notification type and user role
    if (data?.type === 'shift_reminder' && data?.visit_id) {
      router.push(`/caregiver/visit/${data.visit_id}`);
    } else if (data?.type === 'check_in_alert' && userRole === 'family') {
      router.push('/family/care');
    } else if (data?.type === 'check_out_alert' && userRole === 'family') {
      router.push('/family/care');
    } else if (data?.type === 'daily_report' && userRole === 'family') {
      router.push('/family/reports');
    } else if (data?.type === 'schedule_change') {
      router.push('/caregiver/schedule');
    } else if (data?.type === 'missed_checkout' && data?.visit_id) {
      router.push(`/agency/visits/${data.visit_id}`);
    } else {
      // Default: go to notification center
      router.push('/notifications');
    }

    // Mark as read
    if (data?.notification_id) {
      markAsRead(data.notification_id);
    }
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    refreshUnreadCount();
  }

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
```

### Step 3: Send Push Notification Edge Function (Updated)

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface NotificationRequest {
  user_id?: string;
  user_ids?: string[]; // Support multiple recipients
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
  channel?: string; // Android channel
}

serve(async (req) => {
  const payload: NotificationRequest = await req.json();

  // Get user IDs to notify
  const userIds = payload.user_ids || (payload.user_id ? [payload.user_id] : []);

  if (userIds.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No user IDs provided' }),
      { status: 400 }
    );
  }

  // Get all device tokens for these users
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token, user_id')
    .in('user_id', userIds);

  if (!tokens || tokens.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No device tokens found', user_ids: userIds }),
      { status: 404 }
    );
  }

  // Store notifications in database for each user
  const notificationInserts = userIds.map(userId => ({
    user_id: userId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    data: payload.data,
    read: false,
  }));

  const { data: notifications } = await supabase
    .from('notifications')
    .insert(notificationInserts)
    .select();

  // Build Expo push messages
  const messages = tokens.map((t) => {
    const notification = notifications?.find(n => n.user_id === t.user_id);
    return {
      to: t.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      channelId: payload.channel || 'default',
      data: {
        ...payload.data,
        notification_id: notification?.id,
        type: payload.type,
      },
    };
  });

  // Send to Expo Push API (batch if needed)
  const results = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    const result = await response.json();
    results.push(result);
  }

  return new Response(
    JSON.stringify({
      success: true,
      notifications_created: notifications?.length || 0,
      push_sent: tokens.length,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Step 4: Notify Family on Check-In (NEW)

```typescript
// supabase/functions/notify-check-in/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface CheckInEvent {
  visit_id: string;
  method: 'gps' | 'qr_code';
}

serve(async (req) => {
  const event: CheckInEvent = await req.json();

  // Get visit details
  const { data: visit } = await supabase
    .from('visits')
    .select(`
      id,
      elder_id,
      actual_start,
      caregiver:user_profiles(first_name, last_name),
      elder:elders(first_name, last_name)
    `)
    .eq('id', event.visit_id)
    .single();

  if (!visit) {
    return new Response(JSON.stringify({ error: 'Visit not found' }), {
      status: 404,
    });
  }

  // Get family members who want check-in notifications
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('user_id, name, notification_preferences')
    .eq('elder_id', visit.elder_id)
    .eq('invite_status', 'accepted')
    .not('user_id', 'is', null);

  if (!familyMembers || familyMembers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No family members with app' }));
  }

  // Filter to those who want check-in alerts
  const recipientIds = familyMembers
    .filter(fm => fm.notification_preferences?.check_in !== false)
    .map(fm => fm.user_id);

  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No recipients want check-in alerts' }));
  }

  // Format notification
  const checkInTime = format(new Date(visit.actual_start), 'h:mm a');
  const caregiverName = `${visit.caregiver.first_name}`;
  const elderName = visit.elder.first_name;

  // Send push notification to all family members
  const { data: result } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: recipientIds,
      title: `${caregiverName} has arrived`,
      body: `Care visit with ${elderName} started at ${checkInTime}`,
      type: 'check_in_alert',
      channel: 'care_updates',
      data: {
        visit_id: visit.id,
        elder_id: visit.elder_id,
      },
    },
  });

  return new Response(
    JSON.stringify({ sent: recipientIds.length, result }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Step 5: Notify Family on Check-Out (NEW)

```typescript
// supabase/functions/notify-check-out/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, differenceInMinutes } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface CheckOutEvent {
  visit_id: string;
}

serve(async (req) => {
  const event: CheckOutEvent = await req.json();

  // Get visit details with tasks
  const { data: visit } = await supabase
    .from('visits')
    .select(`
      id,
      elder_id,
      actual_start,
      actual_end,
      caregiver:user_profiles(first_name, last_name),
      elder:elders(first_name, last_name),
      tasks:visit_tasks(status)
    `)
    .eq('id', event.visit_id)
    .single();

  if (!visit) {
    return new Response(JSON.stringify({ error: 'Visit not found' }), {
      status: 404,
    });
  }

  // Get family members who want check-out notifications
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('user_id, notification_preferences')
    .eq('elder_id', visit.elder_id)
    .eq('invite_status', 'accepted')
    .not('user_id', 'is', null);

  if (!familyMembers || familyMembers.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }));
  }

  // Filter to those who want check-out alerts
  const recipientIds = familyMembers
    .filter(fm => fm.notification_preferences?.check_out !== false)
    .map(fm => fm.user_id);

  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }));
  }

  // Calculate visit stats
  const duration = differenceInMinutes(
    new Date(visit.actual_end),
    new Date(visit.actual_start)
  );
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const completedTasks = visit.tasks.filter((t: any) => t.status === 'completed').length;
  const totalTasks = visit.tasks.length;

  // Format notification
  const caregiverName = visit.caregiver.first_name;
  const elderName = visit.elder.first_name;

  // Send push notification
  const { data: result } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: recipientIds,
      title: `Visit Complete`,
      body: `${caregiverName}'s visit with ${elderName} is done. ${durationStr}, ${completedTasks}/${totalTasks} tasks.`,
      type: 'check_out_alert',
      channel: 'care_updates',
      data: {
        visit_id: visit.id,
        elder_id: visit.elder_id,
        duration: durationStr,
        tasks_completed: String(completedTasks),
        tasks_total: String(totalTasks),
      },
    },
  });

  return new Response(
    JSON.stringify({ sent: recipientIds.length, result }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Troubleshooting

### Notifications not received
**Cause:** Token not registered or expired
**Solution:** Re-register token on app launch, verify user_type is correct

### Family member not receiving notifications
**Cause:** user_id not linked in family_members table
**Solution:** Ensure family signup completed and user_id is populated

### Badge count not updating
**Cause:** iOS permission or async timing
**Solution:** Ensure badge permission granted, use setBadgeCountAsync after marking read
