'use server';

import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { generateEmbedding } from '../services/embeddings';
import { revalidatePath } from 'next/cache';

/**
 * 向量化补全服务器动作 (Backfill Embeddings Action)
 * 专门用于修复数据库中存在的缺失向量的文章。
 */
export async function backfillEmbeddingsAction(batchSize: number = 20) {
  const supabase = getSupabaseClient();

  try {
    // 1. 查找缺失向量的文章 (仅查找中文表 articles，因为用户设定只向量化中文)
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, summary, tldr, category, keywords')
      .is('embedding', null)
      .order('id', { ascending: false })
      .limit(batchSize);

    if (error) {
      throw new Error(`Failed to fetch articles for backfill: ${error.message}`);
    }

    if (!articles || articles.length === 0) {
      return { success: true, count: 0, message: '报告总监：向量数据已全部补齐，没有发现缺失。' };
    }

    let successCount = 0;
    let failCount = 0;
    const ERROR_THRESHOLD = 3;

    // 2. 逐篇执行向量化 (Sequential execution to respect API rate limits)
    for (const article of articles) {
      if (failCount >= ERROR_THRESHOLD) {
        console.warn('[Backfill] Error threshold reached. Stopping batch.');
        break;
      }

      try {
        const keywordsStr = Array.isArray(article.keywords) ? article.keywords.join(' ') : '';
        const contentToEmbed =
          `${article.title || ''} ${article.category || ''} ${keywordsStr} ${article.summary || ''} ${article.tldr || ''}`.trim();

        if (contentToEmbed.length < 10) {
          console.warn(`[Backfill] Skipping article ${article.id} due to low content length`);
          continue;
        }

        const embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT');
        
        if (embedding) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ embedding })
            .eq('id', String(article.id));

          if (updateError) {
            console.error(`[Backfill] Failed to save embedding for ${article.id}:`, updateError.message);
            failCount++;
          } else {
            successCount++;
          }
        }
      } catch (err: any) {
        console.error(`[Backfill] Error processing article ${article.id}:`, err.message);
        failCount++;
        // 如果是致命的环境错误（如地区不支持），第一个就报错则可以返回更清晰的消息
        if (failCount >= ERROR_THRESHOLD) {
          return { 
            success: false, 
            count: successCount,
            message: `检测到连续报错 (${failCount}次)，已自动熔断。最后一次错误: ${err.message}` 
          };
        }
      }
    }

    // 3. 刷新看板缓存
    revalidatePath('/admin/dashboard');

    const message = failCount > 0 
      ? `向量修复完成。成功: ${successCount}, 失败: ${failCount}。`
      : `本项向量修复成功了！已处理 ${successCount} 篇文章。`;

    return {
      success: true,
      count: successCount,
      failed: failCount,
      message: message,
    };
  } catch (error: any) {
    console.error('[Backfill Action] Fatal error:', error);
    return { success: false, message: error.message };
  }
}
