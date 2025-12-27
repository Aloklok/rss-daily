'use server';

import { generateBriefingWithGemini } from '@/lib/server/gemini';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Article } from '@/types';
import { stripTags, cleanAIContent } from '@/utils/contentUtils';
import { fetchArticleContentServer } from '@/lib/server/dataFetcher';

// Init Supabase Service Client for writing to DB
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Update: Accept Article + Optional Content from Client
export async function generateBriefingAction(article: Article, clientContent?: string) {
  try {
    let rawContent = clientContent;

    // 1. Check if client provided content (Ideal case)
    if (!rawContent || rawContent.trim().length === 0) {
      // Fallback: Fetch Full Content from FreshRSS Server-Side
      console.log(`Debug: Client content empty for ${article.id}, fetching from server...`);
      const fullContentData = await fetchArticleContentServer(String(article.id));
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

    const { briefing, metadata } = await generateBriefingWithGemini(payload);

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
    };

    const { error: updateError } = await supabase.from('articles').upsert(
      {
        id: String(article.id),
        title: briefing.title || article.title,
        link: article.link,
        sourceName: article.sourceName,
        published: article.published,
        // AI Fields
        ...finalBriefing,
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

    // 4. Revalidate
    revalidatePath(`/article/${article.id}`);
    revalidatePath('/');

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
