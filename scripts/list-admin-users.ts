#!/usr/bin/env ts-node
/**
 * List Admin Users Script
 *
 * Lists all users in the admin_users table.
 *
 * Usage:
 *   npm run admin:list
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching admin users...');
  console.log('');

  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (admins.length === 0) {
      console.log('📭 No admin users found');
      console.log('');
      console.log('Add an admin user with:');
      console.log('  npm run admin:add <user-id> <email>');
      return;
    }

    console.log(`Found ${admins.length} admin user(s):`);
    console.log('');

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email}`);
      console.log(`   User ID: ${admin.userId}`);
      console.log(`   Created: ${admin.createdAt.toISOString()}`);
      console.log(`   Created By: ${admin.createdBy || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error fetching admin users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
