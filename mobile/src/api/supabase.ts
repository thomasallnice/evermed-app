// Supabase Client for React Native
// Uses AsyncStorage for session persistence

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

// DIAGNOSTIC LOGGING - Log all environment variables to help debug TestFlight crashes
console.log('=== SUPABASE INITIALIZATION START ===')
console.log('Build: 1.0.16 (Defensive Constants checking + hardcoded fallbacks)')
console.log('Configuration check:')

// Read from Constants.expoConfig.extra (defined in app.config.js)
// Fallback to hardcoded values for Xcode builds (where config might not be embedded)
const extra = (Constants && Constants.expoConfig && Constants.expoConfig.extra) ? Constants.expoConfig.extra : {}

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

// Use hardcoded fallbacks for Xcode/TestFlight builds where Constants.expoConfig might be undefined
// These fallbacks ensure the app ALWAYS has valid configuration, even if Constants.expoConfig is undefined
const supabaseUrl = extra.supabaseUrl || 'https://wukrnqifpgjwbqxpockm.supabase.co'
const supabaseAnonKey = extra.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1a3JucWlmcGdqd2JxeHBvY2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzE0OTIsImV4cCI6MjA3MDY0NzQ5Mn0.fQvTlVO4xqcPXjKM1D-lTbmEpmeO1fv5S2rLBLoPgdI'

console.log('Using Supabase URL:', supabaseUrl)
console.log('Using Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20))

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
export const API_URL = extra.apiUrl || 'https://app.getcarbly.app'
