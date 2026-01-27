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
  const filePath = path.join(process.cwd(), 'src/domains/intelligence/prompts/CHAT_PROMPT.MD');
  const args = process.argv.slice(2);
  const isNewVersion = args.includes('--new');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${filePath} not found.`);
    process.exit(1);
  }

  console.log(`📖 Reading from ${filePath}...`);
  const promptContent = fs.readFileSync(filePath, 'utf-8');

  // 如果是新版本模式，先备份旧数据
  if (isNewVersion) {
    console.log('📦 Detect --new flag. Fetching current prompt for backup...');
    const { data: currentData, error: fetchError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'gemini_chat_prompt')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching current prompt:', fetchError.message);
      process.exit(1);
    }

    if (currentData) {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const backupKey = `gemini_chat_prompt_${today}`;
      console.log(`💾 Backing up current prompt to key: ${backupKey}...`);

      const { error: backupError } = await supabase.from('app_config').upsert(
        {
          key: backupKey,
          value: currentData.value,
          updated_at: new Date().toISOString().split('T')[0],
        },
        { onConflict: 'key' },
      );

      if (backupError) {
        console.error('❌ Error backing up prompt:', backupError.message);
        process.exit(1);
      }
      console.log('✅ Backup successful.');
    } else {
      console.log('⚠️ No existing prompt found to backup. Skipping.');
    }
  }

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
