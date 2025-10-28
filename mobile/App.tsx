// Main App Component
// Entry point for EverMed mobile app

import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, Text, StyleSheet } from 'react-native'
import Constants from 'expo-constants'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/contexts/AuthContext'
import { RootNavigator } from './src/navigation/RootNavigator'

// Import HealthKit safely
let HealthKit: any = null
try {
  HealthKit = require('./src/api/healthkit')
} catch (error) {
  console.log('[APP] HealthKit module not available:', error)
}

// DIAGNOSTIC: Log app start immediately
console.log('=== APP.TSX LOADING ===')
console.log('React Native app is starting...')
console.log('Build: 1.0.6 (HARDCODED + no app.json)')

export default function App() {
  // Add error boundary to catch issues
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    console.log('=== APP MOUNTED ===')
    console.log('App.tsx useEffect running')
    console.log('Configuration at runtime:')
    const extra = Constants.expoConfig?.extra || {}
    console.log('- extra.supabaseUrl:', extra.supabaseUrl ? 'present' : 'MISSING')
    console.log('- extra.supabaseAnonKey:', extra.supabaseAnonKey ? 'present' : 'MISSING')
    console.log('- extra.apiUrl:', extra.apiUrl || 'MISSING')
    console.log('- All extra keys:', Object.keys(extra))

    // Sync Apple Health on app launch if connected
    // Delay to ensure app is fully initialized
    const syncHealthKitOnLaunch = async () => {
      try {
        // Wait a bit to ensure all modules are loaded
        await new Promise(resolve => setTimeout(resolve, 2000))

        console.log('[APP LAUNCH] Checking HealthKit availability...')

        // Check if HealthKit module exists
        if (!HealthKit || typeof HealthKit.isHealthKitAvailable !== 'function') {
          console.log('[APP LAUNCH] HealthKit module not loaded')
          return
        }

        const isAvailable = await HealthKit.isHealthKitAvailable()

        if (!isAvailable) {
          console.log('[APP LAUNCH] HealthKit not available on this device')
          return
        }

        console.log('[APP LAUNCH] HealthKit available, checking connection status...')
        const status = await HealthKit.getConnectionStatus()

        if (!status.isConnected) {
          console.log('[APP LAUNCH] HealthKit not connected')
          return
        }

        console.log('[APP LAUNCH] HealthKit connected, performing background sync...')
        await HealthKit.performBackgroundSync()
        console.log('[APP LAUNCH] HealthKit sync completed successfully')
      } catch (error) {
        console.error('[APP LAUNCH] HealthKit sync failed:', error)
        // Silently fail - don't block app startup
      }
    }

    syncHealthKitOnLaunch()
  }, [])

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>App Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  try {
    return (
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    )
  } catch (err: any) {
    console.error('App render error:', err)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Render Error</Text>
        <Text style={styles.errorText}>{err?.message || String(err)}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fee2e2',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
  },
})
