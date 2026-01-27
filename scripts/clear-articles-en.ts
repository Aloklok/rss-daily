import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearArticlesEn() {
  console.log('🗑️ Clearing articles_en table...');
  const { error } = await supabase.from('articles_en').delete().neq('id', '0'); // Delete all rows (id != 0 is a safe catch-all usually, or just empty filter)

  // Note: Suapbase delete requires a filter. neq 'id' '0' works if ids are not 0.
  // Or we can fetch all IDs and delete? No, delete with filter is better.
  // Let's use gte('id', 0) if id is int? ID is string (bigint).

  if (error) {
    console.error('❌ Failed to clear table:', error);
  } else {
    console.log('✅ Table cleared.');
  }
}

clearArticlesEn();
