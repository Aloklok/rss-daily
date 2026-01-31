/**
 * 翻译回填 API 端点
 *
 * 由 Vercel Cron 每天调用，自动翻译失败的文章
 * 使用 HUNYUAN_TRANSLATION_MODEL（--single 模式）确保翻译质量
 *
 * 调度：每天 UTC 17:00 (北京时间 01:00)
 */
import { createClient } from '@supabase/supabase-js';
import { translateBatchAndSave } from '@/domains/intelligence/services/translate';
import { HUNYUAN_TRANSLATION_MODEL } from '@/domains/intelligence/constants';
import { NextRequest, NextResponse } from 'next/server';

// 每次最多处理的文章数量（避免 Vercel 5 分钟超时）
const MAX_ARTICLES_PER_RUN = 10;

// Vercel Cron 配置
export const maxDuration = 300; // 5 分钟 (Vercel Pro 最大值)

/**
 * 递归获取所有 ID，突破 Supabase 1000 条限制
 */
async function fetchAllIds(
  supabase: any, // 使用 any 避免复杂泛型问题
  tableName: string,
  hasSummary: boolean = false,
) {
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

export async function GET(req: NextRequest) {
  // 1. 验证 Cron 请求 (Vercel 会发送 CRON_SECRET header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 如果配置了 CRON_SECRET，则验证
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Backfill] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Backfill] Starting translation backfill...');

  try {
    // 2. 初始化 Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 3. 获取所有文章 ID 进行差集计算
    const [allIds, translatedIds] = await Promise.all([
      fetchAllIds(supabase, 'articles', true),
      fetchAllIds(supabase, 'articles_en'),
    ]);

    const allArticleIdList = allIds.map((r) => r.id);
    const translatedIdSet = new Set(translatedIds.map((r) => r.id));
    const untranslatedIds = allArticleIdList.filter((id) => !translatedIdSet.has(id));

    console.log(`[Backfill] Already translated: ${translatedIdSet.size}`);
    console.log(`[Backfill] Pending: ${untranslatedIds.length}`);

    if (untranslatedIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All articles already translated',
        stats: {
          total: allArticleIdList.length,
          translated: translatedIdSet.size,
          pending: 0,
          processed: 0,
        },
      });
    }

    // 4. 获取待翻译文章内容（限制数量避免超时）
    const idsToProcess = untranslatedIds.slice(0, MAX_ARTICLES_PER_RUN);
    const { data: articles, error: contentError } = await supabase
      .from('articles')
      .select(
        'id, title, category, summary, tldr, highlights, critiques, "marketTake", keywords, link, "sourceName", published, n8n_processing_date, verdict',
      )
      .in('id', idsToProcess)
      .order('published', { ascending: false });

    if (contentError) {
      console.error('[Backfill] Failed to fetch content:', contentError);
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles to process',
        stats: { processed: 0, pending: untranslatedIds.length },
      });
    }

    // 5. 逐篇翻译（使用 HUNYUAN_TRANSLATION_MODEL，即 --single 模式）
    let successCount = 0;
    let failedCount = 0;

    for (const article of articles) {
      const chunk = [
        {
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
        },
      ];

      try {
        const result = await translateBatchAndSave(chunk, HUNYUAN_TRANSLATION_MODEL);
        if (result.success) {
          successCount += result.count;
          console.log(`[Backfill] ✅ Translated article ${article.id}`);
        } else {
          failedCount++;
          console.error(`[Backfill] ❌ Failed article ${article.id}: ${result.error}`);
        }
      } catch (e: any) {
        failedCount++;
        console.error(`[Backfill] 💥 Error article ${article.id}: ${e.message}`);
      }
    }

    const remainingCount = untranslatedIds.length - successCount;

    console.log(`[Backfill] Completed: ${successCount} success, ${failedCount} failed`);
    console.log(`[Backfill] Remaining: ${remainingCount}`);

    return NextResponse.json({
      success: true,
      message: `Processed ${articles.length} articles`,
      stats: {
        total: allArticleIdList.length,
        translated: translatedIdSet.size + successCount,
        pending: remainingCount,
        processed: articles.length,
        success: successCount,
        failed: failedCount,
      },
    });
  } catch (e: any) {
    console.error('[Backfill] Fatal error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
