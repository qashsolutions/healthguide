// HealthGuide Haptic Feedback
// Provides tactile feedback for successful actions

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback
 */
export async function hapticFeedback(type: HapticType = 'medium'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support haptics, use vibration as fallback
      if ('vibrate' in navigator) {
        navigator.vibrate(type === 'heavy' ? 100 : 50);
      }
      return;
    }

    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Haptics may not be available on all devices
    console.log('Haptics not available:', error);
  }
}

/**
 * Vibrate device (fallback for older devices)
 */
export function vibrate(duration: number = 200): void {
  Vibration.vibrate(duration);
}
