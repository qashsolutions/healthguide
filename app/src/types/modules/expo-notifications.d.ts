declare module 'expo-notifications' {
  export interface NotificationContent {
    title?: string;
    body?: string;
    data?: Record<string, any>;
    sound?: boolean | string;
  }

  export interface Notification {
    request: {
      content: NotificationContent;
      trigger: any;
      identifier: string;
    };
    date: number;
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
  }

  export interface NotificationChannel {
    id: string;
    name: string;
    importance?: number;
    description?: string;
    vibrationPattern?: number[];
    sound?: string;
    showBadge?: boolean;
    enableLights?: boolean;
    lightColor?: string;
  }

  export interface NotificationCategory {
    identifier: string;
    actions: any[];
  }

  export interface ExpoPushToken {
    data: string;
    type: 'expo';
  }

  export function getPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function requestPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function getExpoPushTokenAsync(options?: any): Promise<ExpoPushToken>;
  export function setNotificationChannelAsync(channelId: string, channel: Omit<NotificationChannel, 'id'>): Promise<void>;
  export function setNotificationHandler(handler: {
    handleNotification: (notification: Notification) => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }): void;
  export function addNotificationReceivedListener(listener: (notification: Notification) => void): { remove: () => void };
  export function addNotificationResponseReceivedListener(listener: (response: NotificationResponse) => void): { remove: () => void };
  export function scheduleNotificationAsync(options: {
    content: NotificationContent;
    trigger: any;
  }): Promise<string>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
  export function dismissAllNotificationsAsync(): Promise<void>;
  export function setNotificationCategoryAsync(identifier: string, actions: any[]): Promise<void>;
  export function setBadgeCountAsync(count: number): Promise<void>;
  export function getPresentedNotificationsAsync(): Promise<Notification[]>;
  export const AndroidImportance: { MAX: number; HIGH: number; DEFAULT: number; LOW: number; MIN: number };
}
