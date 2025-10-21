#!/usr/bin/env node
/**
 * Create a Person record for a user
 * Usage: node scripts/create-person-record.mjs <email>
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
  console.error('Usage: node scripts/create-person-record.mjs <email>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase configuration')
  console.error('Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('\n🔧 Creating Person record...\n')
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
  // 1. Find user in Supabase Auth
  console.log(`\n📧 Looking up user: ${email}`)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error fetching users:', listError.message)
    process.exit(1)
  }

  const user = users.find(u => u.email === email)

  if (!user) {
    console.log('❌ User not found in Supabase Auth')
    console.log('\n💡 To create this user, sign up via the mobile app or web app first')
    process.exit(1)
  }

  console.log('✅ User found')
  console.log(`   User ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)

  // 2. Check if Person already exists
  console.log(`\n👤 Checking for existing Person record...`)
  const existingPerson = await prisma.person.findFirst({
    where: { ownerId: user.id },
  })

  if (existingPerson) {
    console.log('⚠️  Person record already exists!')
    console.log(`   Person ID: ${existingPerson.id}`)
    console.log('\n✅ Nothing to do - user is already set up correctly.')
    process.exit(0)
  }

  console.log('No existing Person record found')

  // 3. Create Person record
  console.log(`\n🔨 Creating Person record...`)
  const person = await prisma.person.create({
    data: {
      ownerId: user.id,
      fullName: email.split('@')[0], // Use email prefix as placeholder name
      // Optional fields can be updated later via onboarding
      dateOfBirth: null,
      glucoseTargetMin: 70,
      glucoseTargetMax: 180,
    },
  })

  console.log('✅ Person record created successfully!')
  console.log(`   Person ID: ${person.id}`)
  console.log(`   Full Name: ${person.fullName}`)
  console.log(`   Owner ID: ${person.ownerId}`)

  console.log('\n' + '='.repeat(80))
  console.log('🎉 SUCCESS - User setup is now complete!')
  console.log('\n📱 You can now:')
  console.log('   1. Upload food photos in the mobile app')
  console.log('   2. Log meals and track nutrition')
  console.log('   3. View glucose trends')
  console.log('\n💡 The user can update their profile later via the onboarding flow.')

} catch (error) {
  console.error('\n❌ Error:', error.message)
  console.error(error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
