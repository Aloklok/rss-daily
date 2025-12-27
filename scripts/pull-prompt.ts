import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local first (if it exists), then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

// 确保环境变量存在
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY in environment variables.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pullPrompt() {
  console.log('🔄 Connecting to Supabase...');

  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'gemini_briefing_prompt')
    .single();

  if (error) {
    console.error('❌ Error fetching prompt from Supabase:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.error('⚠️ Prompt not found in app_config (key: gemini_briefing_prompt).');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), 'PROMPT.MD');
  fs.writeFileSync(filePath, data.value);

  console.log(`✅ Successfully pulled prompt to ${filePath}`);
}

pullPrompt();
