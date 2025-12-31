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

async function pushPrompt() {
  const filePath = path.join(process.cwd(), 'PROMPT.MD');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${filePath} not found.`);
    process.exit(1);
  }

  console.log(`📖 Reading from ${filePath}...`);
  const promptContent = fs.readFileSync(filePath, 'utf-8');

  console.log('🔄 Upserting to Supabase...');

  // 使用 upsert: 如果 key 存在则更新内容，不存在则插入新行
  const { error } = await supabase.from('app_config').upsert(
    {
      key: 'gemini_briefing_prompt',
      value: promptContent,
    },
    { onConflict: 'key' }, // 明确指定根据 'key' 字段判断冲突
  );

  if (error) {
    console.error('❌ Error pushing prompt to Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ Successfully synced prompt to Supabase (key: gemini_briefing_prompt).');
}

pushPrompt();
