#!/usr/bin/env tsx
/**
 * Apply fix to make food-photos bucket public using Prisma
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function applyFix() {
  console.log('🔧 Applying fix to food-photos bucket via Prisma...\n')

  try {
    // Execute raw SQL to make bucket public
    const result = await prisma.$executeRaw`
      UPDATE storage.buckets
      SET public = true
      WHERE name = 'food-photos'
    `

    console.log('✅ Bucket updated successfully!')
    console.log('   Rows affected:', result)
    console.log()

    // Verify the change
    const verification: any = await prisma.$queryRaw`
      SELECT name, public, created_at
      FROM storage.buckets
      WHERE name = 'food-photos'
    `

    console.log('📊 Current bucket status:')
    console.log(JSON.stringify(verification, null, 2))
    console.log()

    return true
  } catch (error: any) {
    console.error('❌ Error executing SQL:', error.message)
    console.log('\n⚠️ Alternative: Run this SQL manually in Supabase SQL Editor:')
    console.log('   UPDATE storage.buckets SET public = true WHERE name = \'food-photos\';')
    return false
  } finally {
    await prisma.$disconnect()
  }
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
