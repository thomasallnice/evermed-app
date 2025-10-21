#!/usr/bin/env node
/**
 * Supabase Configuration Verification Script
 *
 * Checks that mobile app and backend are using the same Supabase project
 * to avoid authentication/authorization issues.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🔍 Supabase Configuration Verification\n')
console.log('=' .repeat(80))

// Read mobile .env file
const mobileEnvPath = path.join(rootDir, 'mobile', '.env')
let mobileConfig = {}

if (fs.existsSync(mobileEnvPath)) {
  const mobileEnvContent = fs.readFileSync(mobileEnvPath, 'utf-8')
  const mobileEnvLines = mobileEnvContent.split('\n')

  for (const line of mobileEnvLines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      mobileConfig[key.trim()] = value.trim()
    }
  }

  console.log('\n📱 Mobile App Configuration (mobile/.env):')
  console.log('-'.repeat(80))
  console.log(`EXPO_PUBLIC_SUPABASE_URL: ${mobileConfig.EXPO_PUBLIC_SUPABASE_URL || '❌ MISSING'}`)
  console.log(`EXPO_PUBLIC_SUPABASE_ANON_KEY: ${mobileConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY ? mobileConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 30) + '...' : '❌ MISSING'}`)
  console.log(`EXPO_PUBLIC_API_URL: ${mobileConfig.EXPO_PUBLIC_API_URL || '❌ MISSING'}`)
} else {
  console.log('\n❌ Mobile .env file not found at:', mobileEnvPath)
}

// Read backend .env.local file
const backendEnvPath = path.join(rootDir, '.env.local')
let backendConfig = {}

if (fs.existsSync(backendEnvPath)) {
  const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf-8')
  const backendEnvLines = backendEnvContent.split('\n')

  for (const line of backendEnvLines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      backendConfig[key.trim()] = value.trim()
    }
  }

  console.log('\n🌐 Backend Configuration (.env.local):')
  console.log('-'.repeat(80))
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${backendConfig.NEXT_PUBLIC_SUPABASE_URL || backendConfig.SUPABASE_URL || '❌ MISSING'}`)
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${backendConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || backendConfig.SUPABASE_ANON_KEY ? (backendConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || backendConfig.SUPABASE_ANON_KEY).substring(0, 30) + '...' : '❌ MISSING'}`)
} else {
  console.log('\n❌ Backend .env.local file not found at:', backendEnvPath)
}

// Compare configurations
console.log('\n\n🔬 Configuration Comparison:')
console.log('='.repeat(80))

const mobileUrl = mobileConfig.EXPO_PUBLIC_SUPABASE_URL
const backendUrl = backendConfig.NEXT_PUBLIC_SUPABASE_URL || backendConfig.SUPABASE_URL

const mobileKey = mobileConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY
const backendKey = backendConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || backendConfig.SUPABASE_ANON_KEY

let hasIssues = false

// Check Supabase URL
console.log('\n📍 Supabase URL:')
if (mobileUrl && backendUrl) {
  if (mobileUrl === backendUrl) {
    console.log(`  ✅ MATCH: ${mobileUrl}`)
  } else {
    console.log(`  ❌ MISMATCH:`)
    console.log(`     Mobile:  ${mobileUrl}`)
    console.log(`     Backend: ${backendUrl}`)
    hasIssues = true
  }
} else {
  console.log(`  ⚠️  Cannot compare - one or both values missing`)
  hasIssues = true
}

// Check Anon Key
console.log('\n🔑 Supabase Anon Key:')
if (mobileKey && backendKey) {
  if (mobileKey === backendKey) {
    console.log(`  ✅ MATCH: ${mobileKey.substring(0, 30)}...`)
  } else {
    console.log(`  ❌ MISMATCH:`)
    console.log(`     Mobile:  ${mobileKey.substring(0, 30)}...`)
    console.log(`     Backend: ${backendKey.substring(0, 30)}...`)
    hasIssues = true
  }
} else {
  console.log(`  ⚠️  Cannot compare - one or both values missing`)
  hasIssues = true
}

// Check API URL
console.log('\n🌍 API URL (Mobile):')
const apiUrl = mobileConfig.EXPO_PUBLIC_API_URL
if (apiUrl) {
  console.log(`  📍 ${apiUrl}`)

  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    console.log(`  ⚠️  WARNING: Using localhost - this won't work on physical devices!`)
    hasIssues = true
  }
} else {
  console.log(`  ❌ Missing API URL configuration`)
  hasIssues = true
}

// Final verdict
console.log('\n\n' + '='.repeat(80))
if (hasIssues) {
  console.log('❌ ISSUES DETECTED\n')
  console.log('🔧 Fix Required:')
  console.log('   The mobile app and backend are using different Supabase configurations.')
  console.log('   This will cause authentication/authorization failures.\n')
  console.log('📝 To Fix:')
  console.log('   1. Decide which Supabase project to use (mobile or backend)')
  console.log('   2. Update both .env files to use the same SUPABASE_URL and SUPABASE_ANON_KEY')
  console.log('   3. Rebuild the mobile app after updating mobile/.env')
  console.log('   4. Restart Next.js dev server if you updated .env.local\n')
  console.log('💡 Recommended:')
  console.log('   - Production: Use the production Supabase project for both')
  console.log('   - Development: Use the staging/dev Supabase project for both')
  process.exit(1)
} else {
  console.log('✅ ALL CHECKS PASSED\n')
  console.log('🎉 Mobile and backend are using the same Supabase project.')
  console.log('   Authentication should work correctly.')
  process.exit(0)
}
