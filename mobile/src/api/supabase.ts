// Supabase Client for React Native
// Uses AsyncStorage for session persistence

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

// DIAGNOSTIC LOGGING - Log all environment variables to help debug TestFlight crashes
console.log('=== SUPABASE INITIALIZATION START ===')
console.log('Build: 1.0.6 (HARDCODED VALUES + deleted app.json)')
console.log('Configuration check:')

// Read from Constants.expoConfig.extra (defined in app.config.js)
const extra = Constants.expoConfig?.extra || {}

console.log('- extra.supabaseUrl exists:', !!extra.supabaseUrl)
console.log('- extra.supabaseAnonKey exists:', !!extra.supabaseAnonKey)
console.log('- extra.apiUrl exists:', !!extra.apiUrl)

if (extra.supabaseUrl) {
  console.log('- Supabase URL (first 30 chars):', extra.supabaseUrl.substring(0, 30))
}
if (extra.supabaseAnonKey) {
  console.log('- Anon Key (first 20 chars):', extra.supabaseAnonKey.substring(0, 20))
}
if (extra.apiUrl) {
  console.log('- API URL:', extra.apiUrl)
}

const supabaseUrl = extra.supabaseUrl
const supabaseAnonKey = extra.supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('=== CRITICAL ERROR: Missing Supabase configuration ===')
  console.error('This will cause the app to crash.')
  console.error('URL present:', !!supabaseUrl)
  console.error('Key present:', !!supabaseAnonKey)
  console.error('All extra keys:', Object.keys(extra))
  console.error('Constants.expoConfig:', Constants.expoConfig)

  throw new Error(
    'Missing Supabase configuration in Constants.expoConfig.extra. Check app.config.js and eas.json'
  )
}

console.log('Creating Supabase client...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile
  },
})

console.log('=== SUPABASE INITIALIZATION COMPLETE ===')
console.log('Supabase client created successfully!')

// Export API URL for food.ts
export const API_URL = extra.apiUrl || 'http://192.168.178.114:3000'
