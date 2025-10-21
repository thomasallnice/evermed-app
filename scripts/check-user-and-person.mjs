#!/usr/bin/env node
/**
 * Check if a user exists and has a Person record
 * Usage: node scripts/check-user-and-person.mjs <email>
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env.local') })

const email = process.argv[2]

if (!email) {
  console.error('❌ Error: Email required')
  console.error('Usage: node scripts/check-user-and-person.mjs <email>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase configuration')
  console.error('Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('\n🔍 Checking user and Person record...\n')
console.log('=' .repeat(80))

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Create Prisma client
const prisma = new PrismaClient()

try {
  // 1. Check if user exists in Supabase Auth
  console.log(`\n📧 Looking up user: ${email}`)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error fetching users:', listError.message)
    process.exit(1)
  }

  const user = users.find(u => u.email === email)

  if (!user) {
    console.log('❌ User not found in Supabase Auth')
    console.log('\n💡 To create this user, sign up via the mobile app or web app')
    process.exit(1)
  }

  console.log('✅ User found in Supabase Auth')
  console.log(`   User ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
  console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)

  // 2. Check if Person record exists
  console.log(`\n👤 Looking up Person record for user ${user.id}...`)
  const person = await prisma.person.findFirst({
    where: { ownerId: user.id },
  })

  if (!person) {
    console.log('❌ Person record NOT FOUND')
    console.log('\n🔧 This is why you get "404: Person record not found" errors!')
    console.log('\n📝 To fix, run:')
    console.log(`   node scripts/create-person-record.mjs ${email}`)
    process.exit(1)
  }

  console.log('✅ Person record found')
  console.log(`   Person ID: ${person.id}`)
  console.log(`   Full Name: ${person.fullName || '(not set)'}`)
  console.log(`   Date of Birth: ${person.dateOfBirth?.toISOString().split('T')[0] || '(not set)'}`)
  console.log(`   Created: ${person.createdAt.toLocaleString()}`)
  console.log(`   Updated: ${person.updatedAt.toLocaleString()}`)

  // 3. Check for FoodEntry records
  console.log(`\n🍽️  Checking food entries...`)
  const foodEntryCount = await prisma.foodEntry.count({
    where: { personId: person.id },
  })

  console.log(`   Food Entries: ${foodEntryCount}`)

  console.log('\n' + '='.repeat(80))
  console.log('✅ ALL CHECKS PASSED')
  console.log('\n🎉 User setup is complete. The app should work correctly.')

} catch (error) {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
