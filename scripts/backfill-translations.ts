/**
 * 存量文章翻译脚本
 *
 * 将所有未翻译的中文文章批量翻译为英文
 *
 * 上下文计算：
 * - Qwen3-8B 上下文窗口：128K tokens
 * - 每篇文章约 2500 tokens（输入+输出）
 * - 理论上限：~50 篇/批次
 * - 保守设置：逐篇翻译，避免上下文溢出和 API 限频
 *
 * 使用方法：
 *   npx tsx scripts/backfill-translations.ts [--limit N] [--batch]
 *
 * 参数：
 *   --limit N    限制翻译数量（用于测试）
 *   --batch      启用批量模式（默认为逐篇翻译模式）
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { translateBatchAndSave } from '../src/domains/intelligence/services/translate';
import {
  DEFAULT_TRANSLATION_MODEL,
  HUNYUAN_TRANSLATION_MODEL,
} from '../src/domains/intelligence/constants';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 解析命令行参数
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const isBatch = process.argv.includes('--batch'); // 默认为 single 模式，需显式传 --batch 开启批量

// 配置 (默认为 single 模式：逐篇翻译，使用混元模型)
const BATCH_SIZE = isBatch ? 5 : 1;
const CONCURRENCY = isBatch ? 3 : 1;
const CURRENT_MODEL = isBatch ? DEFAULT_TRANSLATION_MODEL : HUNYUAN_TRANSLATION_MODEL;
const DELAY_BETWEEN_BATCHES_MS = isBatch ? 1000 : 500;

/**
 * 递归获取所有 ID，突破 Supabase 1000 条限制
 */
async function fetchAllIds(tableName: string, hasSummary: boolean = false) {
  let allIds: { id: string | number }[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    let query = supabase
      .from(tableName)
      .select('id')
      .range(from, from + PAGE_SIZE - 1);

    if (hasSummary) {
      query = query.not('summary', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Failed to fetch IDs from ${tableName}:`, error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allIds = allIds.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allIds;
}

async function backfillTranslations() {
  console.log('🌐 Starting backfill translations (Concurrent Mode)...');
  console.log(`🤖 Model: ${CURRENT_MODEL}${!isBatch ? ' (Single Mode 🎯)' : ' (Batch Mode 📦)'}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE} | ⚡ Concurrency: ${CONCURRENCY}`);

  if (limit) {
    console.log(`📊 Limit: ${limit} articles`);
  }

  // 1. 获取所有 ID 以进行精准差集计算 (全量抓取)
  let allArticleIdList: (string | number)[] = [];
  let translatedIdSet = new Set<string | number>();

  try {
    const [allIds, tIds] = await Promise.all([
      fetchAllIds('articles', true),
      fetchAllIds('articles_en'),
    ]);
    allArticleIdList = allIds.map((r) => r.id);
    translatedIdSet = new Set(tIds.map((r) => r.id));
  } catch (_e) {
    return;
  }

  const untranslatedIds = allArticleIdList.filter((id) => !translatedIdSet.has(id));
  const totalPending = untranslatedIds.length;

  console.log(`✅ Already translated: ${translatedIdSet.size} articles`);
  console.log(`📉 Total pending: ${totalPending} articles`);

  if (totalPending === 0) {
    console.log('✨ All articles processed!');
    return;
  }

  const activeLimit = limit || 100;
  const idsToProcess = untranslatedIds.slice(0, activeLimit);

  // 2. 获取目标文章内容
  const { data: finalArticles, error: contentError } = await supabase
    .from('articles')
    .select(
      'id, title, category, summary, tldr, highlights, critiques, "marketTake", keywords, link, "sourceName", published, n8n_processing_date, verdict',
    )
    .in('id', idsToProcess)
    .order('published', { ascending: false });

  if (contentError) {
    console.error('❌ Failed to fetch content:', contentError);
    return;
  }

  const total = finalArticles.length;
  console.log(`📝 Total articles in this run: ${total}`);

  // 3. 并发批量处理
  let totalSuccess = 0;
  let totalFailed = 0;
  let completedCount = 0;

  // 将文章切分为等额批次
  const batches: any[][] = [];
  for (let i = 0; i < total; i += BATCH_SIZE) {
    batches.push(finalArticles.slice(i, i + BATCH_SIZE));
  }

  console.log(`🚀 Processing ${batches.length} batches with concurrency of ${CONCURRENCY}...\n`);

  // 定义单个任务执行器
  const processBatch = async (batch: any[], batchIndex: number) => {
    const chunk = batch.map((article) => ({
      id: String(article.id),
      title: article.title || '',
      category: article.category || '',
      summary: article.summary || '',
      tldr: article.tldr || '',
      highlights: article.highlights || '',
      critiques: article.critiques || '',
      marketTake: article.marketTake || '',
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
      link: article.link,
      sourceName: article.sourceName,
      published: article.published,
      n8n_processing_date: article.n8n_processing_date,
      verdict: article.verdict,
    }));

    try {
      let result = await translateBatchAndSave(chunk, CURRENT_MODEL);

      // FALLBACK: If batch fails, try each article individually to isolate "bad" articles
      if (!result.success && chunk.length > 1) {
        console.warn(
          `⚠️ Batch #${batchIndex + 1} failed. Falling back to individual processing for ${chunk.length} articles...`,
        );
        let subSuccess = 0;
        for (const item of chunk) {
          const subResult = await translateBatchAndSave(
            [item],
            !isBatch ? HUNYUAN_TRANSLATION_MODEL : DEFAULT_TRANSLATION_MODEL,
          );
          if (subResult.success) {
            subSuccess += subResult.count;
          } else {
            console.error(`  ❌ Individual fallback failed for ${item.id}: ${subResult.error}`);
          }
        }
        result = {
          success: subSuccess > 0,
          count: subSuccess,
          error:
            subSuccess < chunk.length
              ? `Partial failure (${chunk.length - subSuccess} articles skipped)`
              : undefined,
        };
      }

      completedCount += chunk.length;
      const progress = ((completedCount / total) * 100).toFixed(1);

      if (result.success) {
        totalSuccess += result.count;
        console.log(
          `✅ [${completedCount}/${total}] (${progress}%) Batch #${batchIndex + 1} Done: ${result.count}/${chunk.length} stored.`,
        );
        if (result.count < chunk.length) {
          totalFailed += chunk.length - result.count;
        }
      } else {
        totalFailed += chunk.length;
        console.error(
          `❌ [${completedCount}/${total}] Batch #${batchIndex + 1} Failed: ${result.error}`,
        );
      }
    } catch (e: any) {
      completedCount += chunk.length;
      totalFailed += chunk.length;
      console.error(`💥 Batch #${batchIndex + 1} Fatal error: ${e.message}`);
    }
  };

  // 使用简单的并行池逻辑
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const pool = batches
      .slice(i, i + CONCURRENCY)
      .map((batch, idx) => processBatch(batch, i + idx));
    await Promise.all(pool);

    if (i + CONCURRENCY < batches.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  // 4. 输出结果
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Batch backfill completed!');
  console.log(`✅ Success (Total): ${totalSuccess}`);
  console.log(`❌ Failed (Total): ${totalFailed}`);
  console.log(`📉 Still remaining overall: ${totalPending - totalSuccess} articles`);
  console.log('='.repeat(60));
}

backfillTranslations().catch(console.error);
