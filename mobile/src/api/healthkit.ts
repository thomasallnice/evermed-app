// HealthKit API Client
// Handles Apple HealthKit integration for glucose data sync

import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createGlucoseReading } from './glucose'

const LAST_SYNC_KEY = '@carbly:healthkit_last_sync'
const CONNECTION_STATUS_KEY = '@carbly:healthkit_connection_status'

// HealthKit permissions - read glucose only
// Wrap in function to avoid accessing AppleHealthKit.Constants at import time
function getPermissions(): HealthKitPermissions {
  return {
    permissions: {
      read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
      write: [], // We only read for now
    },
  }
}

export interface SyncResult {
  synced: number
  skipped: number
  errors: string[]
  lastSyncTime: Date
}

export interface HealthKitConnectionStatus {
  isConnected: boolean
  lastSync: Date | null
  provider: 'apple_health'
}

/**
 * Check if HealthKit is available on this device
 * Only available on iOS devices, not simulators
 */
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false
  }

  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((error, available) => {
      if (error) {
        console.error('[HEALTHKIT] Availability check failed:', error)
        resolve(false)
        return
      }
      resolve(available === true)
    })
  })
}

/**
 * Request permission to read glucose data from HealthKit
 * Shows iOS permission dialog to user
 */
export async function requestPermissions(): Promise<boolean> {
  const available = await isHealthKitAvailable()
  if (!available) {
    throw new Error('HealthKit is not available on this device')
  }

  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(getPermissions(), (error) => {
      if (error) {
        console.error('[HEALTHKIT] Permission request failed:', error)
        reject(new Error('Failed to request HealthKit permissions. Please try again.'))
        return
      }

      console.log('[HEALTHKIT] Permissions granted successfully')
      resolve(true)
    })
  })
}

/**
 * Get the last sync timestamp from local storage
 */
export async function getLastSyncTimestamp(): Promise<Date | null> {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY)
    return timestamp ? new Date(timestamp) : null
  } catch (error) {
    console.error('[HEALTHKIT] Failed to get last sync timestamp:', error)
    return null
  }
}

/**
 * Save the last sync timestamp to local storage
 */
async function saveLastSyncTimestamp(date: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, date.toISOString())
  } catch (error) {
    console.error('[HEALTHKIT] Failed to save last sync timestamp:', error)
  }
}

/**
 * Get HealthKit connection status
 */
export async function getConnectionStatus(): Promise<HealthKitConnectionStatus> {
  try {
    const statusJson = await AsyncStorage.getItem(CONNECTION_STATUS_KEY)
    if (!statusJson) {
      return { isConnected: false, lastSync: null, provider: 'apple_health' }
    }

    const status = JSON.parse(statusJson)
    return {
      ...status,
      lastSync: status.lastSync ? new Date(status.lastSync) : null,
    }
  } catch (error) {
    console.error('[HEALTHKIT] Failed to get connection status:', error)
    return { isConnected: false, lastSync: null, provider: 'apple_health' }
  }
}

/**
 * Save HealthKit connection status
 */
async function saveConnectionStatus(status: HealthKitConnectionStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(CONNECTION_STATUS_KEY, JSON.stringify(status))
  } catch (error) {
    console.error('[HEALTHKIT] Failed to save connection status:', error)
  }
}

/**
 * Disconnect from HealthKit
 * Note: This doesn't revoke iOS permissions, just updates our connection status
 */
export async function disconnect(): Promise<void> {
  await saveConnectionStatus({
    isConnected: false,
    lastSync: null,
    provider: 'apple_health',
  })
  await AsyncStorage.removeItem(LAST_SYNC_KEY)
}

/**
 * Convert mmol/L to mg/dL
 * US standard is mg/dL, some countries use mmol/L
 */
function mmolToMgDl(mmol: number): number {
  return Math.round(mmol * 18.0182)
}

/**
 * Sync glucose readings from HealthKit to backend
 * Only syncs readings that don't already exist in our database
 */
export async function syncGlucoseFromHealthKit(
  startDate?: Date,
  endDate?: Date
): Promise<SyncResult> {
  const available = await isHealthKitAvailable()
  if (!available) {
    throw new Error('HealthKit is not available on this device')
  }

  // Default to last 30 days if no date range specified
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = endDate || new Date()

  console.log('[HEALTHKIT] Syncing glucose readings from', start, 'to', end)

  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    errors: [],
    lastSyncTime: new Date(),
  }

  try {
    // Fetch glucose samples from HealthKit
    const samples = await getBloodGlucoseSamples(start, end)
    console.log(`[HEALTHKIT] Found ${samples.length} glucose readings in HealthKit`)

    if (samples.length === 0) {
      return result
    }

    // Process each sample
    for (const sample of samples) {
      try {
        console.log(`[HEALTHKIT] Processing sample: value=${sample.value}, date=${sample.startDate}`)

        // HealthKit returns glucose in mg/dL by default
        // If the value is suspiciously low (< 20), it might be in mmol/L
        let valueInMgDl = sample.value
        if (sample.value < 20) {
          // Likely mmol/L, convert to mg/dL
          valueInMgDl = mmolToMgDl(sample.value)
          console.log(`[HEALTHKIT] Converting ${sample.value} mmol/L to ${valueInMgDl} mg/dL`)
        }

        // Validate range (20-600 mg/dL is physiologically plausible)
        if (valueInMgDl < 20 || valueInMgDl > 600) {
          console.warn(
            `[HEALTHKIT] SKIP REASON: Invalid value - ${valueInMgDl} mg/dL (original: ${sample.value})`
          )
          result.skipped++
          continue
        }

        console.log(`[HEALTHKIT] Calling createGlucoseReading API: value=${valueInMgDl}, source=cgm, timestamp=${sample.startDate}`)

        // Create glucose reading via API
        // The backend will handle duplicate detection based on timestamp
        await createGlucoseReading(
          valueInMgDl,
          'cgm', // Mark as CGM source (from Apple Health)
          sample.startDate // Use HealthKit timestamp
        )

        result.synced++
        console.log(
          `[HEALTHKIT] ✅ Synced reading: ${valueInMgDl} mg/dL at ${sample.startDate}`
        )
      } catch (error: any) {
        console.error('[HEALTHKIT] SKIP REASON: API error -', error.message)
        console.error('[HEALTHKIT] Full error:', error)
        // Don't fail entire sync if one reading fails
        result.errors.push(error.message || 'Failed to sync reading')
        result.skipped++
      }
    }

    // Update last sync timestamp
    await saveLastSyncTimestamp(result.lastSyncTime)

    // Update connection status
    await saveConnectionStatus({
      isConnected: true,
      lastSync: result.lastSyncTime,
      provider: 'apple_health',
    })

    console.log('[HEALTHKIT] Sync complete:', result)
    return result
  } catch (error: any) {
    console.error('[HEALTHKIT] Sync failed:', error)
    throw new Error(error.message || 'Failed to sync glucose data from HealthKit')
  }
}

/**
 * Get blood glucose samples from HealthKit
 * Internal helper function
 */
function getBloodGlucoseSamples(startDate: Date, endDate: Date): Promise<HealthValue[]> {
  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: false, // Most recent first
      limit: 1000, // Max samples to fetch (adjust if needed)
    }

    AppleHealthKit.getBloodGlucoseSamples(options, (error, results) => {
      if (error) {
        console.error('[HEALTHKIT] Failed to fetch glucose samples:', error)
        reject(new Error('Failed to fetch glucose data from HealthKit'))
        return
      }

      resolve(results || [])
    })
  })
}

/**
 * Sync all historical glucose data from HealthKit
 * Useful for initial import or re-importing all data
 */
export async function syncAllHistoricalData(): Promise<SyncResult> {
  const available = await isHealthKitAvailable()
  if (!available) {
    throw new Error('HealthKit is not available on this device')
  }

  // Sync from 1 year ago to now (or customize the range)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 1) // Last 1 year

  console.log('[HEALTHKIT] Starting full historical sync from last 1 year...')

  return syncGlucoseData(startDate, endDate)
}

/**
 * Perform background sync
 * Called when app opens or user manually triggers sync
 * Silent error handling - logs but doesn't throw
 */
export async function performBackgroundSync(): Promise<SyncResult | null> {
  try {
    const available = await isHealthKitAvailable()
    if (!available) {
      console.log('[HEALTHKIT] Background sync skipped - HealthKit not available')
      return null
    }

    const status = await getConnectionStatus()
    if (!status.isConnected) {
      console.log('[HEALTHKIT] Background sync skipped - not connected')
      return null
    }

    // Sync from last sync time or last 7 days
    const lastSync = await getLastSyncTimestamp()
    const startDate = lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    console.log('[HEALTHKIT] Starting background sync from', startDate)
    const result = await syncGlucoseFromHealthKit(startDate, new Date())

    return result
  } catch (error) {
    console.error('[HEALTHKIT] Background sync failed:', error)
    // Silent failure - don't disrupt user experience
    return null
  }
}

/**
 * Initial setup flow: Request permissions and perform first sync
 * Returns sync result or throws error
 */
export async function connectAndSync(): Promise<SyncResult> {
  // Step 1: Request permissions
  const granted = await requestPermissions()
  if (!granted) {
    throw new Error('HealthKit permissions were not granted')
  }

  // Step 2: Perform initial sync (last 30 days)
  const result = await syncGlucoseFromHealthKit()

  // Step 3: Update connection status
  await saveConnectionStatus({
    isConnected: true,
    lastSync: result.lastSyncTime,
    provider: 'apple_health',
  })

  return result
}
