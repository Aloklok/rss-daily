import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../src/domains/intelligence/services/embeddings';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const force = process.argv.includes('--force');

async function backfill() {
  console.log(`🚀 Starting backfill embeddings... ${force ? '(FORCE MODE ON)' : ''}`);

  if (force) {
    console.log('🧹 FORCE MODE: Resetting all existing embeddings to NULL for a clean start...');
    const { error: resetError } = await supabase
      .from('articles')
      .update({ embedding: null })
      .neq('id', '0'); // Dummy condition to target all rows

    if (resetError) {
      console.error('❌ Failed to reset embeddings:', resetError);
      return;
    }
    console.log('✅ Reset complete.');
  }

  // 1. 获取所有文章 (处理 Supabase 1000 条的分页限制)
  console.log('📡 Fetching all articles...');
  let allArticles: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('articles')
      .select('id, title, summary, tldr, category, keywords')
      .range(from, from + step - 1);

    if (!force) {
      query = query.is('embedding', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching articles:', error);
      return;
    }

    if (data && data.length > 0) {
      allArticles = [...allArticles, ...data];
      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    } else {
      hasMore = false;
    }
  }

  const total = allArticles.length;
  console.log(`📝 Found ${total} articles to process.`);

  if (total === 0) {
    console.log('✨ All articles already have embeddings. Use --force to re-generate.');
    return;
  }

  let count = 0;
  for (const article of allArticles) {
    count++;
    const progress = ((count / total) * 100).toFixed(1);
    try {
      // 拼接文本：标题 + 分类 + 关键词 + 摘要 + TLDR
      const keywordsStr = Array.isArray(article.keywords) ? article.keywords.join(' ') : '';
      const contentToEmbed =
        `${article.title || ''} ${article.category || ''} ${keywordsStr} ${article.summary || ''} ${article.tldr || ''}`.trim();

      if (!contentToEmbed || contentToEmbed.length < 10) {
        console.warn(
          `[${count}/${total}] (${progress}%) ⚠️ Skipping article ${article.id} due to insufficient content.`,
        );
        continue;
      }

      console.log(
        `[${count}/${total}] (${progress}%) ⏳ Generating embedding for: ${article.title?.slice(0, 30)}...`,
      );
      const embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT');

      const { error: updateError } = await supabase
        .from('articles')
        .update({ embedding })
        .eq('id', article.id);

      if (updateError) {
        console.error(`❌ Failed to update article ${article.id}:`, updateError);
      } else {
        console.log(`✅ Success for article ${article.id}`);
      }

      // 稍微延迟一下
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (e) {
      console.error(`💥 Unexpected error for article ${article.id}:`, e);
    }
  }

  console.log('🏁 Backfill completed!');
}

backfill();
