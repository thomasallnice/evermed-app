import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '52ac77af-11b2-4cc6-ba34-241b268e6fe0';

console.log('Checking Person record for user:', userId);

const { data, error } = await supabase
  .from('Person')
  .select('*')
  .eq('ownerId', userId);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
} else if (!data || data.length === 0) {
  console.log('❌ No Person record found for this user');
  console.log('This is why uploads are failing with 401!');
  console.log('\nCreating Person record now...');

  const { data: newPerson, error: createError } = await supabase
    .from('Person')
    .insert({
      ownerId: userId,
      givenName: 'Test',
      familyName: 'User',
      target_glucose_min: 70,
      target_glucose_max: 180
    })
    .select()
    .single();

  if (createError) {
    console.log('❌ Failed to create Person:', createError.message);
    process.exit(1);
  } else {
    console.log('✅ Person record created:');
    console.log(JSON.stringify(newPerson, null, 2));
  }
} else {
  console.log('✅ Person record exists:');
  console.log(JSON.stringify(data[0], null, 2));
}
