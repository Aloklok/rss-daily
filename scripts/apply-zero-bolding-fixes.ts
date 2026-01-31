/**
 * apply-zero-bolding-fixes.ts
 * 读取 add_bolding_decisions.json，将关键词替换为加粗版本
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DECISION_FILES = ['add_bolding_decisions.json', 'add_bolding_decisions_v2.json'];
const TARGET_FIELDS = ['highlights', 'critiques', 'marketTake'] as const;

async function applyFixes() {
  let decisions: any[] = [];

  for (const file of DECISION_FILES) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Decision file not found: ${file}, skipping...`);
      continue;
    }
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📂 Loaded ${fileContent.length} decisions from ${file}`);
    decisions = decisions.concat(fileContent);
  }

  if (decisions.length === 0) {
    console.error('❌ No decisions found in any files.');
    return;
  }

  console.log(`🚀 Starting to apply bolding to ${decisions.length} articles...`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i];
    const { id, fields: boldWords } = decision;

    console.log(`[${i + 1}/${decisions.length}] Processing ${id}...`);

    try {
      // 1. 获取当前文章
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('id, highlights, critiques, marketTake')
        .eq('id', id)
        .single();

      if (fetchError || !article) {
        console.warn(`⚠️ Article not found or error fetching: ${id}`);
        failCount++;
        continue;
      }

      const updates: any = {};
      let hasChanges = false;

      // 2. 依次处理字段
      for (const field of TARGET_FIELDS) {
        const words = boldWords[field];
        if (!words || !Array.isArray(words) || words.length === 0) continue;

        const content = article[field] || '';
        if (content.trim() === '') continue;

        let updatedContent = content;

        // 词级替换：将 word 替换为 **word**
        // 使用正则确保不重复加粗（虽然逻辑上 candidate 应该是 0 加粗）
        for (const word of words) {
          if (!word || word.trim() === '') continue;

          // 转义正则特殊字符
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // 查找未被加粗的词（前后不能有 **）
          // 这里的策略是简单的全局替换，假设原文确实没有加粗
          const regex = new RegExp(`(?<!\\*\\*)${escapedWord}(?!\\*\\*)`, 'g');
          updatedContent = updatedContent.replace(regex, `**${word}**`);
        }

        if (updatedContent !== content) {
          updates[field] = updatedContent;
          hasChanges = true;
        }
      }

      // 3. 提交更新
      if (hasChanges) {
        const { error: updateError } = await supabase.from('articles').update(updates).eq('id', id);

        if (updateError) {
          console.error(`❌ Failed to update ${id}:`, updateError.message);
          failCount++;
        } else {
          console.log(`✅ Updated ${id}`);
          successCount++;
          // Rate limit: 5 seconds to avoid flooding translation webhooks
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } else {
        console.log(`⏭️ No changes needed for ${id}`);
        skipCount++;
      }
    } catch (e: any) {
      console.error(`❌ Exception processing ${id}:`, e.message);
      failCount++;
    }
  }

  console.log('\n✨ Done!');
  console.log(`✅ Updated: ${successCount}`);
  console.log(`⏭️ Skipped: ${skipCount}`);
  console.log(`❌ Failed:  ${failCount}`);
}

applyFixes().catch(console.error);
