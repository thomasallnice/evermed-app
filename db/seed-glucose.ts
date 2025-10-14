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

  // Generate realistic glucose data for today
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const glucoseReadings = [];

  // Generate readings every 5 minutes for the past 24 hours
  const startTime = new Date(today.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endTime = new Date(); // Now

  let currentTime = new Date(startTime);

  while (currentTime <= endTime) {
    // Generate realistic glucose value (70-180 mg/dL typical range)
    // Add variation based on time of day (meal times)
    const hour = currentTime.getHours();
    let baseGlucose = 90; // Baseline fasting glucose

    // Simulate meal responses
    if (hour >= 7 && hour <= 9) {
      // Breakfast spike (7am-9am)
      baseGlucose = 100 + Math.random() * 50;
    } else if (hour >= 12 && hour <= 14) {
      // Lunch spike (12pm-2pm)
      baseGlucose = 110 + Math.random() * 60;
    } else if (hour >= 18 && hour <= 20) {
      // Dinner spike (6pm-8pm)
      baseGlucose = 105 + Math.random() * 55;
    } else {
      // Normal range with some variation
      baseGlucose = 80 + Math.random() * 30;
    }

    // Add some random noise
    const glucose = Math.round(baseGlucose + (Math.random() - 0.5) * 10);

    // Clamp to reasonable range
    const clampedGlucose = Math.max(70, Math.min(180, glucose));

    glucoseReadings.push({
      personId: person.id,
      timestamp: new Date(currentTime),
      value: clampedGlucose,
      source: 'cgm' as const,
      deviceId: 'dexcom-g7-simulator',
      confidence: 0.95,
    });

    // Increment by 5 minutes
    currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
  }

  console.log(`Generated ${glucoseReadings.length} glucose readings`);

  // Delete existing glucose readings for this person to avoid duplicates
  const deletedCount = await prisma.glucoseReading.deleteMany({
    where: { personId: person.id },
  });

  console.log(`Deleted ${deletedCount.count} existing glucose readings`);

  // Insert glucose readings in batches (Prisma has a limit on batch size)
  const batchSize = 1000;
  for (let i = 0; i < glucoseReadings.length; i += batchSize) {
    const batch = glucoseReadings.slice(i, i + batchSize);
    await prisma.glucoseReading.createMany({
      data: batch,
    });
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} readings)`);
  }

  await prisma.$disconnect();
  console.log(`✓ Seeded ${glucoseReadings.length} glucose readings for ${targetEmail}`);
}

main().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
