import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('articles')
    .select('highlights, critiques')
    .eq('id', 'tag:google.com,2005:reader/item/0006450a206df83a')
    .single();
  console.log(JSON.stringify(data, null, 2));
}
check();
