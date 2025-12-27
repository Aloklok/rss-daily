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

async function pushPrompt() {
  const filePath = path.join(process.cwd(), 'PROMPT.MD');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${filePath} not found. Run 'npm run prompt:pull' first.`);
    process.exit(1);
  }

  console.log(`📖 Reading from ${filePath}...`);
  const promptContent = fs.readFileSync(filePath, 'utf-8');

  console.log('🔄 Connecting to Supabase...');

  const { error } = await supabase
    .from('app_config')
    .update({ value: promptContent })
    .eq('key', 'gemini_briefing_prompt');

  if (error) {
    console.error('❌ Error updating prompt in Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ Successfully pushed updated prompt to Supabase (key: gemini_briefing_prompt).');
}

pushPrompt();
