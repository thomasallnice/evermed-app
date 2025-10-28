#!/usr/bin/env node

/**
 * Create Demo User Script
 * Creates a demo user account in Supabase for easy testing
 */

const SUPABASE_URL = 'https://nqlxlkhbriqztkzwbdif.supabase.co'
const DEMO_EMAIL = 'demo@getcarbly.app'
const DEMO_PASSWORD = 'DemoPassword123!'

async function createDemoUser() {
  console.log('🚀 Creating demo user account...')
  console.log('Email:', DEMO_EMAIL)
  console.log('Password:', DEMO_PASSWORD)
  console.log('')

  // Get service role key from environment
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment')
    console.error('')
    console.error('Please get your service role key from:')
    console.error('https://app.supabase.com/project/nqlxlkhbriqztkzwbdif/settings/api')
    console.error('')
    console.error('Then run:')
    console.error('export SUPABASE_SERVICE_ROLE_KEY="your-key-here"')
    console.error('node scripts/create-demo-user.js')
    process.exit(1)
  }

  try {
    // Create user via Supabase Admin API
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: 'Demo User',
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()

      // Check if user already exists
      if (error.includes('already registered') || error.includes('User already registered')) {
        console.log('ℹ️  Demo user already exists!')
        console.log('✅ You can now use the "Try Demo Account" button in the app')
        return
      }

      throw new Error(`Failed to create user: ${error}`)
    }

    const data = await response.json()
    console.log('✅ Demo user created successfully!')
    console.log('User ID:', data.id)
    console.log('')
    console.log('You can now use the "Try Demo Account" button in the app')
    console.log('Email:', DEMO_EMAIL)
    console.log('Password:', DEMO_PASSWORD)
  } catch (error) {
    console.error('❌ Error creating demo user:', error.message)
    process.exit(1)
  }
}

createDemoUser()
