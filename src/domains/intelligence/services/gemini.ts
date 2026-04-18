/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Google Gemini AI 服务（基于 Vercel AI SDK 重构）
 *
 * 本文件是对旧版原生 @google/genai SDK 的 AI SDK 重写。
 * 所有导出函数保持与旧版完全相同的签名，确保消费者零改动。
 *
 * 核心升级：
 * 1. generateBriefingWithGemini → 使用 generateObject + Zod Schema，彻底消灭 JSON 解析失败
 * 2. chatWithGemini → 使用 streamText + Google Search 原生工具
 * 3. generateGemini → 使用 generateText，统一推理流处理
 * 4. reRankArticles → 使用 generateObject + Zod Schema
 *
 * 回退方案：旧版实现保留在 git 历史中，可随时回退。
 */

import { generateText, generateObject, streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings';
import { DEFAULT_MODEL_ID, CHAT_CONTEXT_PROMPT_TEMPLATE } from '../constants';
import { createGoogleProvider } from './google-provider';
import { BriefingItemSchema, BriefingArraySchema, ReRankResultSchema } from './briefing-schema';

export { CHAT_CONTEXT_PROMPT_TEMPLATE };

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options) => {
      return fetch(url, { ...options, cache: 'no-store' });
    },
  },
});

export async function getSystemPrompt(): Promise<string> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'gemini_briefing_prompt')
    .single();

  if (error || !data) {
    console.warn('⚠️ Failed to fetch briefing prompt from Supabase, using fallback.');
    throw new Error('Briefing system prompt not found in app_config');
  }

  return data.value;
}

export async function getChatSystemPrompt(): Promise<string> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'gemini_chat_prompt')
    .single();

  if (error || !data) {
    console.warn('⚠️ Failed to fetch chat prompt from Supabase, using fallback.');
    throw new Error('Chat system prompt not found in app_config');
  }

  return data.value;
}

// ============================================================================
// generateBriefingWithGemini
// 核心升级：Gemini 路径使用 generateObject + Zod Schema 实现零容错 JSON
// SiliconFlow 路径保持旧有逻辑（已使用 AI SDK 的 generateText）
// ============================================================================

export async function generateBriefingWithGemini(
  articleData: any | any[],
  modelId: string = DEFAULT_MODEL_ID,
  enableThinking: boolean = false,
): Promise<any> {
  const [cleanModelId, keyAlias] = (modelId || '').split('@');
  const isSiliconFlow = cleanModelId.includes('/');

  const isBatch = Array.isArray(articleData);
  const articles = isBatch ? articleData : [articleData];

  const systemPromptTemplate = await getSystemPrompt();
  const payloadStr = JSON.stringify(articles);
  const fullPrompt = systemPromptTemplate.replace('{{payload}}', payloadStr);

  let briefingsRaw: any[];
  let responseMetadata: any = {};

  if (isSiliconFlow) {
    // SiliconFlow 路径：保持现有 generateSiliconFlow 实现
    const { generateSiliconFlow } = await import('./siliconflow');
    const { cleanGeminiJson } = await import('@/domains/reading/utils/content');
    const text = await generateSiliconFlow(
      [{ role: 'user', content: fullPrompt }],
      cleanModelId,
      undefined,
      false,
      enableThinking,
    );
    responseMetadata = { finishReason: 'STOP', safetyRatings: [] };

    const cleanJson = cleanGeminiJson(text);
    try {
      const parsed = JSON.parse(cleanJson);
      briefingsRaw = Array.isArray(parsed) ? parsed : [parsed];
    } catch (error: any) {
      console.error('SiliconFlow JSON Parse Failed:', error.message);
      console.error('Raw text length:', text.length);
      throw new Error(`SiliconFlow JSON 解析失败 (Model: ${modelId}): ${error.message}`);
    }
  } else {
    // Gemini 路径：使用 generateObject + Zod Schema（核心升级）
    const google = createGoogleProvider(keyAlias);
    const schema = isBatch ? BriefingArraySchema : BriefingItemSchema;

    try {
      const result = await generateObject({
        model: google(cleanModelId || DEFAULT_MODEL_ID),
        schema,
        prompt: fullPrompt,
        providerOptions: {
          google: {
            thinkingConfig: enableThinking ? { thinkingBudget: -1 } : undefined,
          },
        },
      });

      const parsed = result.object;
      briefingsRaw = Array.isArray(parsed) ? parsed : [parsed];
      responseMetadata = {
        usage: result.usage,
        finishReason: result.finishReason,
      };

      console.log(
        `[Gemini/SDK] generateObject success | Model: ${cleanModelId} | Items: ${briefingsRaw.length} | Tokens: ${result.usage?.totalTokens || 'N/A'}`,
      );
    } catch (error: any) {
      console.error('====================================================');
      console.error('GEMINI generateObject FAILED');
      console.error('Model:', cleanModelId);
      console.error('Error:', error.message);
      console.error('====================================================');
      throw new Error(
        `Gemini 结构化生成失败 (Model: ${modelId}): ${error.message}. 请检查 Vercel 日志获取详情。`,
      );
    }
  }

  // 后处理：生成 Embedding（两条路径共用）
  const processedBriefings = await Promise.all(
    briefingsRaw.map(async (briefing, index) => {
      const originalArticle = articles[index] || articles[0];
      const keywordsStr = Array.isArray(briefing.keywords) ? briefing.keywords.join(' ') : '';
      const contentToEmbed =
        `${briefing.title || originalArticle.title || ''} ${briefing.category || ''} ${keywordsStr} ${briefing.summary || ''} ${briefing.tldr || ''}`.trim();

      let embedding = null;
      try {
        embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT', 'ai');
      } catch (e) {
        console.error(`Failed to generate embedding for article ${originalArticle.id}:`, e);
      }

      return {
        ...briefing,
        embedding,
        articleId: originalArticle.id,
      };
    }),
  );

  if (isBatch) {
    return {
      briefings: processedBriefings,
      metadata: responseMetadata,
    };
  }

  return {
    briefing: processedBriefings[0],
    metadata: responseMetadata,
  };
}

// ============================================================================
// chatWithGemini
// 升级：使用 streamText + Google Search 原生工具
// 返回格式保持 AsyncGenerator<{ text: () => string }> 兼容
// ============================================================================

export async function chatWithGemini(
  messages: any[],
  articles: any[],
  query: string,
  useSearch: boolean = true,
  modelName: string = 'gemini-2.0-flash',
  keyAlias?: string,
  enableThinking: boolean = false,
): Promise<any> {
  const google = createGoogleProvider(keyAlias);

  const chatSystemPromptRaw = await getChatSystemPrompt();
  const chatSystemPrompt = chatSystemPromptRaw.replace(/{{COUNT}}/g, articles.length.toString());
  console.log(
    `[Chat Prompt] Loaded (AI SDK path) | length: ${chatSystemPrompt.length} | preview: ${chatSystemPrompt.slice(0, 100)}`,
  );

  const articleList =
    articles.length > 0
      ? articles
          .map((a) => {
            const dateStr = a.published ? new Date(a.published).toLocaleDateString() : 'N/A';
            const keywordsStr = Array.isArray(a.keywords) ? a.keywords.join(', ') : '';
            const verdictStr = a.verdict
              ? `Score:${a.verdict.score || '?'}/10 (${a.verdict.importance || 'Normal'})`
              : '';

            return `【文章 REF-ID: ${a._refId}】
标题: ${a.title}
来源: ${a.sourceName || 'Unknown'} | ${verdictStr}
日期: ${dateStr}
分类: ${a.category || '未分类'} | 关键词: ${keywordsStr}
TLDR: ${a.tldr || '无'}
摘要: ${a.summary || '无'}
技术亮点: ${a.highlights || '无'}
犀利点评: ${a.critiques || '无'}
市场观点: ${a.marketTake || '无'}`;
          })
          .join('\n\n---\n\n')
      : '（未匹配到相关本地文章）';

  const contextPrompt = CHAT_CONTEXT_PROMPT_TEMPLATE.replace(
    /{{COUNT}}/g,
    articles.length.toString(),
  )
    .replace('{{ARTICLE_LIST}}', articleList)
    .replace('{{QUERY}}', query);

  const formattedHistory = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  const requestId = Math.random().toString(36).substring(7);
  console.log(
    `[Gemini Request] Start | ID: ${requestId} | Key: ${keyAlias || 'Auto'} | UseSearch: ${useSearch} | Thinking: ${enableThinking}`,
  );

  try {
    const result = streamText({
      model: google(modelName),
      system: chatSystemPrompt,
      messages: [
        ...formattedHistory,
        { role: 'user' as const, content: contextPrompt },
      ],
      maxOutputTokens: 8192,
      temperature: 0.7,
      tools: useSearch ? { googleSearch: google.tools.googleSearch({}) } as any : undefined,
      providerOptions: {
        google: {
          thinkingConfig: enableThinking ? { thinkingBudget: -1 } : undefined,
        },
      },
      abortSignal: AbortSignal.timeout(60000),
    });

    // 适配现有消费者接口: yield { text: () => string }
    async function* streamWrapper() {
      for await (const chunk of result.textStream) {
        if (chunk) {
          yield { text: () => chunk };
        }
      }
    }

    return streamWrapper();
  } catch (error: any) {
    console.error(
      `[chatWithGemini Error] ID: ${requestId} | Key: ${keyAlias || 'Auto'} | Query: "${query.slice(0, 30)}..."`,
    );
    console.error('Full Error:', error.message);
    throw new Error(`AI 对话请求失败 (Key: ${keyAlias || 'Auto'}): ${error.message}`);
  }
}

// ============================================================================
// generateGemini
// 通用非流式文本生成（播客脚本等后台任务使用）
// 升级：使用 generateText 替代原生 SDK
// ============================================================================

export async function generateGemini(
  messages: any[],
  modelId: string = DEFAULT_MODEL_ID,
  max_tokens: number = 8192,
  keyAlias?: string,
  enableThinking: boolean = false,
): Promise<string> {
  const [cleanModelId, alias] = (modelId || '').split('@');
  const targetAlias = alias || keyAlias;

  const google = createGoogleProvider(targetAlias);

  const formattedMessages = messages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  const result = await generateText({
    model: google(cleanModelId || DEFAULT_MODEL_ID),
    messages: formattedMessages,
    maxOutputTokens: max_tokens,
    temperature: 0.7,
    providerOptions: {
      google: {
        thinkingConfig: enableThinking ? { thinkingBudget: -1 } : undefined,
      },
    },
  });

  return result.text || '';
}

// ============================================================================
// reRankArticles
// 文章重排序，使用 generateObject + Zod Schema
// ============================================================================

export async function reRankArticles(
  articles: any[],
  query: string,
  modelId: string = 'gemini-3.1-flash-lite-preview',
  keyAlias?: string,
  topK: number = 10,
): Promise<string[]> {
  const google = createGoogleProvider(keyAlias);

  if (articles.length === 0) return [];

  const articleList = articles
    .map((a) => {
      const keywordsStr = Array.isArray(a.keywords) ? a.keywords.slice(0, 5).join(', ') : '';
      return `ID: ${a.id} | Date: ${a.published} | Source: ${a.sourceName}
Title: ${a.title}
Category: ${a.category || 'N/A'} | Keywords: [${keywordsStr}]
Summary: ${a.summary || 'N/A'}`;
    })
    .join('\n---\\n');

  const reRankPrompt = `你是一位专业的资讯分析师。请根据用户的问题 "${query}"，从以下 ${articles.length} 篇文章中选出最相关、最有价值且时效性最强的文章 (最多返回 ${topK} 篇)。
要求：
1. 强制使用 JSON 格式返回：{"selected_ids": ["id1", "id2", ...]}。
2. 若内容高度重复，请仅保留质量最高或最新的一篇。
3. 优先考虑发布日期 (Date) 较近的文章。

待选文章列表：
${articleList}`;

  try {
    const result = await generateObject({
      model: google(modelId),
      schema: ReRankResultSchema,
      prompt: reRankPrompt,
    });

    return result.object.selected_ids || [];
  } catch (e: any) {
    const isQuotaError = e.message.includes('429') || e.message.includes('quota');
    const sheepModel = 'gemini-1.5-flash-lite-latest';

    if (modelId !== sheepModel && isQuotaError) {
      console.warn(
        `[reRankArticles Model Fallback] ${modelId} Quota exceeded, retrying with ${sheepModel} for query: "${query.slice(0, 20)}..."`,
      );
      return reRankArticles(articles, query, sheepModel, keyAlias, topK);
    }

    console.error(
      `[reRankArticles Error] Model: ${modelId} | Key: ${keyAlias || 'Default'} | Query: "${query}"`,
    );
    console.error('Full Error:', e.message);
    return articles.slice(0, topK).map((a) => a.id);
  }
}
