// Check if Person record exists for thomas.gnahm@gmail.com
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from apps/web/.env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../apps/web/.env.local');
dotenv.config({ path: envPath });

console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL ? 'Yes' : 'No');

const prisma = new PrismaClient();

async function checkPerson() {
  try {
    console.log('Checking for Person records in database...\n');

    // Check all Person records
    const allPersons = await prisma.person.findMany({
      select: {
        id: true,
        ownerId: true,
        targetGlucoseMin: true,
        targetGlucoseMax: true,
        cgmConnected: true,
        createdAt: true,
      }
    });

    console.log(`Total Person records in database: ${allPersons.length}\n`);

    if (allPersons.length === 0) {
      console.log('❌ NO PERSON RECORDS EXIST');
      console.log('\n🔍 ROOT CAUSE IDENTIFIED:');
      console.log('   The backend requires a Person record but none exist.');
      console.log('   Backend code: apps/web/src/app/api/metabolic/food/route.ts:191-200');
      console.log('\n💡 FIX:');
      console.log('   Create Person record via onboarding endpoint or manually in Supabase.');
      console.log('\n   Quick Fix (Manual):');
      console.log('   1. Go to Supabase Dashboard → Table Editor → Person');
      console.log('   2. Insert row with:');
      console.log('      - ownerId: <supabase-user-id-for-thomas.gnahm@gmail.com>');
      console.log('      - targetGlucoseMin: 70');
      console.log('      - targetGlucoseMax: 180');
      console.log('      - cgmConnected: false');
    } else {
      console.log('✅ Person records found:');
      allPersons.forEach((p, i) => {
        console.log(`\n  Person ${i + 1}:`);
        console.log(`    ID: ${p.id}`);
        console.log(`    Owner ID: ${p.ownerId}`);
        console.log(`    Glucose Target: ${p.targetGlucoseMin}-${p.targetGlucoseMax} mg/dL`);
        console.log(`    CGM Connected: ${p.cgmConnected}`);
        console.log(`    Created: ${p.createdAt.toISOString()}`);
      });

      console.log('\n⚠️  To verify if one matches thomas.gnahm@gmail.com:');
      console.log('   We need the Supabase user ID (auth.users.id) to match with ownerId.');
      console.log('\n   Check in Supabase Dashboard → Authentication → Users');
      console.log('   Find thomas.gnahm@gmail.com and compare the ID with ownerIds above.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkPerson();
