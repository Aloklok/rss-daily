import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 优先加载 .env.local
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pushChatPrompt() {
  const filePath = path.join(process.cwd(), 'CHAT_PROMPT.MD');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${filePath} not found.`);
    process.exit(1);
  }

  console.log(`📖 Reading from ${filePath}...`);
  const promptContent = fs.readFileSync(filePath, 'utf-8');

  console.log('🔄 Upserting AI Chat System Instruction to Supabase...');

  const { error } = await supabase.from('app_config').upsert(
    {
      key: 'gemini_chat_prompt',
      value: promptContent,
      updated_at: new Date().toISOString().split('T')[0],
    },
    { onConflict: 'key' },
  );

  if (error) {
    console.error('❌ Error pushing chat prompt to Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ Successfully synced chat prompt to Supabase (key: gemini_chat_prompt).');
}

pushChatPrompt();
