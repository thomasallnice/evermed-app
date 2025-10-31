// Haptic Feedback Utilities
// Provides consistent haptic feedback patterns across the app

import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

/**
 * Haptic feedback patterns for different interactions
 */
export const HapticFeedback = {
  /**
   * Light tap - for button presses, selections
   * iOS: Light impact
   */
  light: () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  },

  /**
   * Medium tap - for confirmations, toggles
   * iOS: Medium impact
   */
  medium: () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  },

  /**
   * Heavy tap - for important actions, deletions
   * iOS: Heavy impact
   */
  heavy: () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
  },

  /**
   * Success feedback - for successful actions
   * iOS: Notification success
   */
  success: () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  },

  /**
   * Warning feedback - for warnings, cautions
   * iOS: Notification warning
   */
  warning: () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
  },

  /**
   * Error feedback - for errors, failures
   * iOS: Notification error
   */
  error: () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  },

  /**
   * Selection changed - for picker/slider changes
   * iOS: Selection changed
   */
  selection: () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync()
    }
  },
}

/**
 * Hook for haptic feedback
 * Returns consistent haptic patterns
 */
export function useHaptics() {
  return HapticFeedback
}
