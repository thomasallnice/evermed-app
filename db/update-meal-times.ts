import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from apps/web/.env.local
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function main() {
  const prisma = new PrismaClient();

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Look up user by email
  const targetEmail = 'thomas.gnahm@gmail.com';
  console.log(`Looking up user with email: ${targetEmail}`);

  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    throw new Error(`Failed to list users: ${userError.message}`);
  }

  const user = users.users.find(u => u.email === targetEmail);

  if (!user) {
    throw new Error(`User not found with email: ${targetEmail}`);
  }

  console.log(`Found user: ${user.id}`);

  // Find the Person record for this user
  const person = await prisma.person.findFirst({
    where: { ownerId: user.id },
  });

  if (!person) {
    throw new Error(`Person record not found for user: ${targetEmail}`);
  }

  console.log(`Found person: ${person.id}`);

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch today's food entries
  const foodEntries = await prisma.foodEntry.findMany({
    where: {
      personId: person.id,
      timestamp: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      photos: true,
      ingredients: true,
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  console.log(`Found ${foodEntries.length} food entries for today`);

  if (foodEntries.length === 0) {
    console.log('No meals found for today. Nothing to update.');
    await prisma.$disconnect();
    return;
  }

  // Define meal distribution for the day
  const mealSchedule = [
    { type: 'breakfast', hour: 7, minute: 30 },  // 7:30 AM
    { type: 'lunch', hour: 12, minute: 15 },     // 12:15 PM
    { type: 'snack', hour: 15, minute: 0 },      // 3:00 PM
    { type: 'dinner', hour: 18, minute: 45 },    // 6:45 PM
  ];

  // Update each meal with new timestamp and type
  for (let i = 0; i < Math.min(foodEntries.length, mealSchedule.length); i++) {
    const entry = foodEntries[i];
    const schedule = mealSchedule[i];

    const newTimestamp = new Date(today);
    newTimestamp.setHours(schedule.hour, schedule.minute, 0, 0);

    console.log(`\nUpdating meal ${i + 1}:`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Old: ${entry.mealType} at ${entry.timestamp.toISOString()}`);
    console.log(`  New: ${schedule.type} at ${newTimestamp.toISOString()}`);

    await prisma.foodEntry.update({
      where: { id: entry.id },
      data: {
        mealType: schedule.type as any,
        timestamp: newTimestamp,
      },
    });

    console.log(`  ✓ Updated successfully`);
  }

  await prisma.$disconnect();
  console.log(`\n✓ Successfully updated ${Math.min(foodEntries.length, mealSchedule.length)} meals`);
  console.log('\nMeal distribution:');
  console.log('  • 7:30 AM  - Breakfast');
  console.log('  • 12:15 PM - Lunch');
  console.log('  • 3:00 PM  - Snack');
  console.log('  • 6:45 PM  - Dinner');
}

main().catch((e) => {
  console.error('Update failed:', e);
  process.exit(1);
});
