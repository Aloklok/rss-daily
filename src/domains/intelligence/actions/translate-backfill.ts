'use server';

import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { translateBatchAndSave, ArticleToTranslate } from '../services/translate';
import { HUNYUAN_TRANSLATION_MODEL } from '../constants';
import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * 助手函数：突破 Supabase 1000 条限制获取所有 ID
 */
async function fetchAllIds(supabase: any, tableName: string, isZh: boolean = false) {
  let allData: string[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    let query = supabase.from(tableName).select('id');
    
    if (isZh) {
      // 只有经过 AI 初筛生成过 verdict 的才计入补全基数
      query = query.not('verdict', 'is', null).neq('verdict', '{}');
    }

    const { data, error } = await query
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const ids = data.map((d: any) => String(d.id));
    allData = allData.concat(ids);
    
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allData;
}

/**
 * 从文章的日期字段中提取 YYYY-MM-DD 格式的日期 (对齐 API 逻辑)
 */
function extractDate(article: any): string | null {
  const dateStr = article.n8n_processing_date || article.published;
  if (!dateStr) return null;
  return dateStr.split('T')[0];
}

/**
 * 批量触发英文页面缓存失效 (对齐 API 逻辑)
 */
function revalidateEnglishPages(affectedDates: Set<string>) {
  if (affectedDates.size === 0) return;

  // 1. 清除英文日期列表缓存（侧边栏用）
  revalidateTag('available-dates-en', 'max');

  // 2. 逐日期清除对应的页面和数据缓存
  for (const date of affectedDates) {
    revalidateTag(`briefing-data-${date}-en`, 'max');
    revalidatePath(`/en/date/${date}`);
  }

  console.log(
    `[Backfill-Action] ♻️ Revalidated ${affectedDates.size} EN date pages: ${[...affectedDates].join(', ')}`,
  );
}

/**
 * 翻译补全服务器动作 (Backfill Translations Action)
 * 完全对齐 api/translate/backfill 的逻辑。
 */
export async function backfillTranslationsAction(limit: number = 3) {
  const supabase = getSupabaseClient();

  try {
    // 1. 获取全量 ID 进行差集计算
    const [allIds, translatedIds] = await Promise.all([
      fetchAllIds(supabase, 'articles', true),
      fetchAllIds(supabase, 'articles_en')
    ]);

    const translatedIdSet = new Set(translatedIds.map(r => String(r.id)));
    const untranslatedIds = allIds
      .filter(r => !translatedIdSet.has(String(r.id)))
      .map(r => String(r.id));

    if (untranslatedIds.length === 0) {
      return { success: true, count: 0, message: '已经全部补齐啦！没有发现缺失的翻译。' };
    }

    // 2. 获取待处理文章内容 (按照 API 定义的字段)
    const targetIds = untranslatedIds.slice(0, limit);
    const { data: articles, error: contentError } = await supabase
      .from('articles')
      .select('id, title, category, summary, tldr, highlights, critiques, "marketTake", keywords, link, "sourceName", published, n8n_processing_date, verdict')
      .in('id', targetIds)
      .order('published', { ascending: false });

    if (contentError || !articles) {
      throw new Error(`Failed to fetch content: ${contentError?.message}`);
    }

    // 3. 逐篇翻译 (串行使用混元模型)
    let successCount = 0;
    let failedCount = 0;
    let lastError = '';
    const affectedDates = new Set<string>();

    console.log(`[Backfill-Action] Starting sequential Hunyuan translation for ${articles.length} articles...`);

    for (const article of articles) {
      // 构造成服务需要的翻译格式
      const chunk = [{
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
      }];

      try {
        const result = await translateBatchAndSave(chunk, HUNYUAN_TRANSLATION_MODEL);
        if (result.success) {
          successCount += result.count;
          const date = extractDate(article);
          if (date) affectedDates.add(date);
        } else {
          failedCount++;
          lastError = result.error || 'Unknown Error';
        }
      } catch (e: any) {
        failedCount++;
        lastError = e.message || 'Fatal Error';
      }
    }

    // 4. 重大补全：触发英文缓存失效
    revalidateEnglishPages(affectedDates);
    revalidatePath('/admin/dashboard');

    if (successCount > 0) {
      return {
        success: true,
        count: successCount,
        message: `本项翻译成功了！已使用混元模型补全 ${successCount} 篇文章。${failedCount > 0 ? `(失败 ${failedCount} 篇: ${lastError})` : ''}`,
      };
    } else {
      return {
        success: false,
        message: `修复未成功: ${lastError || '请检查 API 额度或网络环境'}`,
      };
    }
  } catch (error: any) {
    console.error('[Backfill-Action] Fatal error:', error);
    return { success: false, message: `系统错误: ${error.message}` };
  }
}
