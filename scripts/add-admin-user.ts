#!/usr/bin/env ts-node
/**
 * Add Admin User Script
 *
 * Adds a user to the admin_users table to grant admin access.
 *
 * Usage:
 *   npm run admin:add <user-id> <email>
 *
 * Example:
 *   npm run admin:add abc-123-def admin@evermed.ai
 *
 * The user-id should be the Supabase auth.users.id (UUID) of the user.
 * You can get this from:
 *   - Supabase Dashboard → Authentication → Users
 *   - SQL: SELECT id, email FROM auth.users WHERE email = 'user@example.com';
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Error: Missing required arguments');
    console.error('');
    console.error('Usage: npm run admin:add <user-id> <email>');
    console.error('');
    console.error('Example:');
    console.error('  npm run admin:add abc-123-def admin@evermed.ai');
    console.error('');
    console.error('The user-id should be the Supabase auth.users.id (UUID)');
    console.error('Get it from: Supabase Dashboard → Authentication → Users');
    process.exit(1);
  }

  const [userId, email] = args;

  console.log('Adding admin user...');
  console.log(`  User ID: ${userId}`);
  console.log(`  Email: ${email}`);
  console.log('');

  try {
    // Check if admin user already exists
    const existing = await prisma.adminUser.findUnique({
      where: { userId },
    });

    if (existing) {
      console.log('⚠️  Admin user already exists');
      console.log(`  Email: ${existing.email}`);
      console.log(`  Created: ${existing.createdAt.toISOString()}`);
      console.log('');
      console.log('✅ No changes needed');
      return;
    }

    // Add admin user
    const admin = await prisma.adminUser.create({
      data: {
        userId,
        email,
        createdBy: 'manual-script',
      },
    });

    console.log('✅ Admin user added successfully!');
    console.log('');
    console.log('Details:');
    console.log(`  User ID: ${admin.userId}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Created: ${admin.createdAt.toISOString()}`);
    console.log('');
    console.log('This user now has access to:');
    console.log('  - /api/admin/metrics');
    console.log('  - /api/admin/usage/tokens');
    console.log('  - /api/admin/feature-flags');
    console.log('  - /api/admin/metabolic');
  } catch (error) {
    console.error('❌ Error adding admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
