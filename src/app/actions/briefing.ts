'use server';

import { generateBriefingWithGemini } from '@/domains/intelligence/services/gemini';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Article } from '@/types';
import { stripTags, cleanAIContent } from '@/domains/reading/utils/content';
import { fetchArticleContent } from '@/domains/reading/services';

// Init Supabase Service Client for writing to DB
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Update: Accept Article + Optional Content from Client + Optional Model ID
export async function generateBriefingAction(
  article: Article,
  clientContent?: string,
  modelId?: string,
) {
  try {
    let rawContent = clientContent;

    // 1. Check if client provided content (Ideal case)
    if (!rawContent || rawContent.trim().length === 0) {
      // Fallback: Fetch Full Content from FreshRSS Server-Side
      console.log(`Debug: Client content empty for ${article.id}, fetching from server...`);
      const fullContentData = await fetchArticleContent(String(article.id));
      rawContent = fullContentData?.content || article.summary || '';
    } else {
      console.log(
        `Debug: Using client-provided content for ${article.id} (Len: ${rawContent.length})`,
      );
    }

    if (!rawContent || rawContent.trim().length === 0) {
      return { success: false, error: '文章内容为空 (Empty Content)，无法生成简报。' };
    }

    // Clean content: Strip HTML tags
    const cleanContent = stripTags(rawContent);

    // Double check after stripping tags
    if (!cleanContent || cleanContent.trim().length === 0) {
      return { success: false, error: '文章仅包含HTML标签或图片，无有效文字内容。' };
    }

    const payload = {
      id: article.id,
      title: article.title,
      link: article.link,
      sourceName: article.sourceName,
      published: article.published,
      content: cleanContent,
    };

    if (!payload.content) {
      console.warn(`Warning: Generating briefing for ${article.id} with empty content.`);
    }

    console.log('------------ GEMINI REQUEST PAYLOAD ------------');
    console.log(JSON.stringify(payload, null, 2));
    console.log('------------------------------------------------');

    const { briefing, metadata } = await generateBriefingWithGemini(payload, modelId);

    console.log('------------ GEMINI RESPONSE BRIEFING ------------');
    console.log(JSON.stringify(briefing, null, 2));
    console.log('--------------------------------------------------');

    // 3. Upsert to Supabase
    // We update the fields that the AI generated.
    // Use shared utility to clean content and ensure consistent string format
    const finalBriefing = {
      summary: cleanAIContent(briefing.summary),
      tldr: cleanAIContent(briefing.tldr),
      category: cleanAIContent(briefing.category),
      keywords: Array.isArray(briefing.keywords) ? briefing.keywords : [],
      verdict: briefing.verdict,
      highlights: cleanAIContent(briefing.highlights),
      critiques: cleanAIContent(briefing.critiques),
      marketTake: cleanAIContent(briefing.marketTake),
      title: briefing.title || article.title,
    };

    const { error: updateError } = await supabase.from('articles').upsert(
      {
        id: String(article.id),
        link: article.link,
        sourceName: article.sourceName,
        published: article.published,
        // AI Fields
        ...finalBriefing,
        embedding: (briefing as any).embedding,
        // Preserve existing processing date if available (to keep it in its original daily timeline)
        // If missing (new generation), use the original published date to place it in the correct history context
        // Fallback to NOW only if both are missing
        n8n_processing_date:
          article.n8n_processing_date || article.published || new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (updateError) {
      throw updateError;
    }

    // 4. Smart Revalidate
    // Clear Article Detail
    revalidatePath(`/article/${article.id}`);

    // Clear Date Page (Granular)
    const date = (article.n8n_processing_date || article.published || '').split('T')[0];
    if (date) {
      const { revalidateTag } = await import('next/cache');
      revalidateTag(`briefing-data-${date}`, 'max');
      revalidatePath(`/date/${date}`);

      // Clear Homepage if it's today
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
        new Date(),
      );
      if (date === today) {
        revalidatePath('/');
      }
    }

    return {
      success: true,
      metadata,
      briefing: finalBriefing, // Return safe data
      sentPayload: payload,
    };
  } catch (error: any) {
    console.error('Generate Briefing Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * [真·批量] 批量生成简报动作
 * 1. 并发获取文章正文
 * 2. 构造数组 Payload 调用 Gemini
 * 3. 结果合并后执行单次批量 Upsert
 */
export async function generateBulkBriefingAction(articles: Article[], modelId?: string) {
  try {
    console.log(`[BulkAction] Starting for ${articles.length} articles using model: ${modelId}`);

    // 1. 获取所有文章的正文 (由串行/并发请求改为真·批量请求)
    const { fetchMultipleArticleContents } = await import('@/domains/reading/services');
    const titleMap = new Map<string, string>();
    articles.forEach((a) => titleMap.set(String(a.id), a.title));

    const contentMap = await fetchMultipleArticleContents(
      articles.map((a) => a.id),
      titleMap,
    );

    const { stripTags } = await import('@/domains/reading/utils/content');

    const payloads = articles.map((article) => {
      const fullContentData = contentMap.get(String(article.id));
      const rawContent = fullContentData?.content || article.summary || '';
      const cleanContent = stripTags(rawContent);

      return {
        id: article.id,
        title: article.title,
        link: article.link,
        sourceName: article.sourceName,
        published: article.published,
        content: cleanContent,
        n8n_processing_date: article.n8n_processing_date,
      };
    });

    // 2. 调用重构后的 Gemini 批量接口
    const result = await generateBriefingWithGemini(payloads, modelId);
    const { briefings, metadata } = result;

    if (!briefings || !Array.isArray(briefings)) {
      throw new Error('Gemini did not return an array of briefings in bulk mode');
    }

    // 3. 构造批量 Upsert 数据
    const upsertItems = briefings.map((briefing: any) => {
      const originalArticle = articles.find((a) => String(a.id) === String(briefing.articleId));

      const finalAIFields = {
        summary: cleanAIContent(briefing.summary),
        tldr: cleanAIContent(briefing.tldr),
        category: cleanAIContent(briefing.category),
        keywords: Array.isArray(briefing.keywords) ? briefing.keywords : [],
        verdict: briefing.verdict,
        highlights: cleanAIContent(briefing.highlights),
        critiques: cleanAIContent(briefing.critiques),
        marketTake: cleanAIContent(briefing.marketTake),
        title: briefing.title || originalArticle?.title,
      };

      return {
        id: String(briefing.articleId),
        link: originalArticle?.link,
        sourceName: originalArticle?.sourceName,
        published: originalArticle?.published,
        // AI Generated Fields
        ...finalAIFields,
        embedding: briefing.embedding,
        // 时间戳修正
        n8n_processing_date:
          originalArticle?.n8n_processing_date ||
          originalArticle?.published ||
          new Date().toISOString(),
      };
    });

    // 4. 执行单次批量 Upsert 并获取结果用于验证
    const { data: savedItems, error: updateError } = await supabase
      .from('articles')
      .upsert(upsertItems, { onConflict: 'id' })
      .select('id');

    if (updateError) {
      console.error('[BulkAction] Upsert Error:', updateError);
      throw updateError;
    }

    // 5. 触发批量 Revalidate
    const datesToRevalidate = new Set<string>();
    upsertItems.forEach((item) => {
      const d = item.n8n_processing_date.split('T')[0];
      if (d) datesToRevalidate.add(d);
    });

    // Dynamic import to ensure server-side execution
    const { revalidateTag } = await import('next/cache');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
      new Date(),
    );

    for (const date of datesToRevalidate) {
      // 1. Invalidate Data Cache
      revalidateTag(`briefing-data-${date}`, 'max');

      // 2. Invalidate Page Cache
      revalidatePath(`/date/${date}`);

      // 3. Invalidate Homepage if it's today
      if (date === today) {
        revalidatePath('/');
      }
    }

    return {
      success: true,
      saved: savedItems?.length || 0,
      total: articles.length,
      results: upsertItems.map((item) => ({ id: item.id, title: item.title })), // 返回 ID 与标题的映射
      metadata,
    };
  } catch (error: any) {
    console.error('[BulkAction] Error:', error);
    // 尝试提取状态码 (例如 429, 500)
    const statusMatch = error.message?.match(/\b(\d{3})\b/);
    const statusCode = statusMatch ? ` ${statusMatch[1]}` : '';
    return { success: false, error: `[BulkAction${statusCode}] ${error.message}` };
  }
}
