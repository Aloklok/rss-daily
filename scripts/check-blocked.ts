import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Try different keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBlockedLogs() {
  const { data, error } = await supabase
    .from('bot_hits')
    .select('created_at, path, status, bot_name, user_agent, error_reason')
    .or('status.eq.403,bot_name.eq.未知爬虫')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkBlockedLogs();
