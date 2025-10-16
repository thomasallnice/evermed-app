#!/usr/bin/env tsx
/**
 * Check bucket configuration details
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkConfig() {
  console.log('🔍 Checking food-photos bucket configuration...\n')

  try {
    const bucketConfig: any = await prisma.$queryRaw`
      SELECT
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types,
        created_at,
        updated_at
      FROM storage.buckets
      WHERE name = 'food-photos'
    `

    if (bucketConfig.length > 0) {
      const config = bucketConfig[0]
      console.log('📊 Bucket Configuration:')
      console.log('  - ID:', config.id)
      console.log('  - Name:', config.name)
      console.log('  - Public:', config.public)
      console.log('  - File size limit:', config.file_size_limit ? `${config.file_size_limit} bytes` : 'No limit')
      console.log('  - Allowed MIME types:', config.allowed_mime_types || 'All types allowed')
      console.log('  - Created:', config.created_at)
      console.log('  - Updated:', config.updated_at)
    } else {
      console.log('❌ Bucket not found')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkConfig()
