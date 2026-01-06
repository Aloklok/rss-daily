import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local first (if it exists), then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY in environment variables.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pullChatPrompt() {
  console.log('🔄 Connecting to Supabase...');

  const { data, error } = await supabase
    .from('app_config')
    .select('value, updated_at')
    .eq('key', 'gemini_chat_prompt')
    .single();

  if (error) {
    console.error('❌ Error fetching from Supabase:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.error('⚠️ Chat prompt not found in app_config (key: gemini_chat_prompt).');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), 'CHAT_PROMPT.MD');
  fs.writeFileSync(filePath, data.value);

  console.log(`✅ Successfully pulled chat prompt to ${filePath}`);
  if (data.updated_at) {
    console.log(`🕒 Chat Prompt Last Updated at: ${data.updated_at}`);
  }
}

pullChatPrompt();
