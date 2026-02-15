// HealthGuide Push Notifications Setup
// Handles Expo push notification registration and handling

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type NotificationUserType = 'caregiver' | 'agency_owner' | 'family';

// Configure notification handler (not supported on web)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Register for push notifications and store token in database
 */
export async function registerForPushNotifications(
  userId: string,
  userType: NotificationUserType = 'caregiver'
): Promise<string | null> {
  // Check if physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const token = tokenData.data;

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HealthGuide',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });

    // Additional channel for visit updates
    await Notifications.setNotificationChannelAsync('visits', {
      name: 'Visit Updates',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Check-in and check-out notifications',
    });

    // Channel for daily reports
    await Notifications.setNotificationChannelAsync('reports', {
      name: 'Daily Reports',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Daily care summary reports',
    });
  }

  // Store token in database
  await saveDeviceToken(userId, token, userType);

  return token;
}

/**
 * Save device token to Supabase
 */
async function saveDeviceToken(
  userId: string,
  token: string,
  userType: NotificationUserType
): Promise<void> {
  const deviceInfo = {
    platform: Platform.OS,
    model: Device.modelName,
    os_version: Device.osVersion,
  };

  // Upsert token (update if exists, insert if not)
  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: token,
        user_type: userType,
        device_type: Platform.OS,
        device_info: deviceInfo,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,expo_push_token',
      }
    );

  if (error) {
    console.error('Failed to save device token:', error);
  }
}

/**
 * Remove device token (for logout)
 */
export async function removeDeviceToken(userId: string): Promise<void> {
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  await supabase
    .from('device_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('expo_push_token', token);
}

/**
 * Register notification categories for interactive actions
 */
export async function registerNotificationCategories(): Promise<void> {
  // Visit update category
  await Notifications.setNotificationCategoryAsync('visit_update', [
    {
      identifier: 'view',
      buttonTitle: 'View Details',
      options: { opensAppToForeground: true },
    },
  ]);

  // Daily report category
  await Notifications.setNotificationCategoryAsync('daily_report', [
    {
      identifier: 'view',
      buttonTitle: 'View Full Report',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);

  // Assignment reminder category (for caregivers)
  await Notifications.setNotificationCategoryAsync('assignment_reminder', [
    {
      identifier: 'start',
      buttonTitle: 'Start Visit',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Remind in 10 min',
    },
  ]);
}

/**
 * Handle notification response (when user taps notification)
 */
export function setupNotificationResponseHandler(
  navigate: (screen: string, params?: any) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as any;

      // Handle different notification types
      switch (data.type) {
        case 'check_in':
        case 'check_out':
          if (data.visit_id) {
            navigate('FamilyVisitDetail', { visitId: data.visit_id });
          }
          break;

        case 'daily_report':
          if (data.report_id) {
            navigate('FamilyReportDetail', { reportId: data.report_id });
          }
          break;

        case 'assignment_reminder':
          if (data.visit_id) {
            navigate('CaregiverVisitDetail', { visitId: data.visit_id });
          }
          break;

        default:
          // Navigate to notifications list
          navigate('Notifications');
      }
    }
  );

  return () => subscription.remove();
}

/**
 * Handle foreground notifications
 */
export function setupForegroundHandler(): () => void {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // Notification received while app is in foreground
      // Could show an in-app toast/banner here
      console.log('Notification received:', notification.request.content.title);
    }
  );

  return () => subscription.remove();
}

/**
 * Clear notification badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Get pending notifications count
 */
export async function getPendingNotificationsCount(): Promise<number> {
  const notifications = await Notifications.getPresentedNotificationsAsync();
  return notifications.length;
}
