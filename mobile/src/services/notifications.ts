// Notification Service
// Handles post-meal glucose reminder notifications

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const REMINDER_DELAY_KEY = '@carbly:reminder_delay_minutes'
const DEFAULT_REMINDER_DELAY = 90 // minutes after meal

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export interface GlucoseReminderConfig {
  delayMinutes: number // Time after meal to remind (60-120)
  enabled: boolean
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('glucose-reminders', {
      name: 'Glucose Test Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[NOTIFICATIONS] Permission denied')
    return false
  }

  console.log('[NOTIFICATIONS] Permission granted')
  return true
}

/**
 * Get user's preferred reminder delay
 * Default: 90 minutes after meal
 */
export async function getReminderDelay(): Promise<number> {
  try {
    const delay = await AsyncStorage.getItem(REMINDER_DELAY_KEY)
    return delay ? parseInt(delay, 10) : DEFAULT_REMINDER_DELAY
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to get reminder delay:', error)
    return DEFAULT_REMINDER_DELAY
  }
}

/**
 * Save user's preferred reminder delay
 */
export async function setReminderDelay(minutes: number): Promise<void> {
  try {
    if (minutes < 60 || minutes > 180) {
      throw new Error('Reminder delay must be between 60 and 180 minutes')
    }
    await AsyncStorage.setItem(REMINDER_DELAY_KEY, minutes.toString())
    console.log(`[NOTIFICATIONS] Reminder delay set to ${minutes} minutes`)
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to save reminder delay:', error)
    throw error
  }
}

/**
 * Schedule a glucose test reminder after meal is logged
 *
 * @param mealType - Type of meal (breakfast, lunch, dinner, snack)
 * @param mealTime - When the meal was eaten (ISO timestamp)
 * @returns Notification ID (can be used to cancel)
 */
export async function scheduleGlucoseReminder(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  mealTime: Date
): Promise<string | null> {
  try {
    // Get user's preferred delay
    const delayMinutes = await getReminderDelay()

    // Calculate trigger time
    const triggerDate = new Date(mealTime.getTime() + delayMinutes * 60 * 1000)

    // Don't schedule if trigger time is in the past
    if (triggerDate <= new Date()) {
      console.log('[NOTIFICATIONS] Skipping reminder - trigger time in past')
      return null
    }

    const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1)

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🩸 Time to test your glucose',
        body: `It's been ${delayMinutes} minutes since ${mealLabel}. Test now to track the impact of this meal.`,
        data: {
          type: 'glucose_reminder',
          mealType,
          mealTime: mealTime.toISOString(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'glucose-reminder',
      },
      trigger: triggerDate,
    })

    console.log(
      `[NOTIFICATIONS] Scheduled glucose reminder for ${mealLabel} at ${triggerDate.toISOString()}`
    )
    return notificationId
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to schedule reminder:', error)
    return null
  }
}

/**
 * Cancel a scheduled glucose reminder
 */
export async function cancelGlucoseReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
    console.log(`[NOTIFICATIONS] Cancelled reminder ${notificationId}`)
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to cancel reminder:', error)
  }
}

/**
 * Cancel all scheduled glucose reminders
 */
export async function cancelAllGlucoseReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    console.log('[NOTIFICATIONS] Cancelled all glucose reminders')
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to cancel all reminders:', error)
  }
}

/**
 * Get all scheduled notification IDs
 * Useful for debugging
 */
export async function getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    console.log(`[NOTIFICATIONS] ${scheduled.length} reminders scheduled`)
    return scheduled
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to get scheduled reminders:', error)
    return []
  }
}

/**
 * Listen for notification responses (when user taps notification)
 * Navigate to glucose entry screen
 */
export function addNotificationResponseListener(
  callback: (mealType: string, mealTime: string) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data

    if (data.type === 'glucose_reminder') {
      console.log('[NOTIFICATIONS] User tapped glucose reminder:', data)
      callback(data.mealType, data.mealTime)
    }
  })
}

/**
 * Track reminder completion rate
 * Stores whether user tested glucose after reminder
 */
export async function trackReminderCompletion(
  notificationId: string,
  completed: boolean
): Promise<void> {
  try {
    const completionData = {
      notificationId,
      completed,
      timestamp: new Date().toISOString(),
    }

    // Store in analytics (non-PHI)
    // TODO: Send to analytics endpoint when implemented
    console.log('[NOTIFICATIONS] Reminder completion tracked:', completionData)
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to track reminder completion:', error)
  }
}
