#!/usr/bin/env tsx
/**
 * Apply fix to make food-photos bucket public
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyFix() {
  console.log('🔧 Applying fix to food-photos bucket...\n')

  // Execute SQL to make bucket public
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      UPDATE storage.buckets
      SET public = true
      WHERE name = 'food-photos'
      RETURNING name, public, created_at;
    `
  })

  if (error) {
    console.error('❌ Error executing SQL:', error)
    console.log('\n⚠️ Alternative: Run this SQL manually in Supabase SQL Editor:')
    console.log('   UPDATE storage.buckets SET public = true WHERE name = \'food-photos\';')
    return false
  }

  console.log('✅ Bucket updated successfully!')
  console.log('   Data:', JSON.stringify(data, null, 2))
  console.log()

  return true
}

applyFix()
  .then(success => {
    if (success) {
      console.log('✅ Fix applied. Run verification script to confirm:')
      console.log('   npx tsx scripts/verify-food-photos-bucket.ts')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Script error:', error)
    process.exit(1)
  })
