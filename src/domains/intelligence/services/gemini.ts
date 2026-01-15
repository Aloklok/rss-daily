/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { cleanGeminiJson } from '@/domains/reading/utils/content';
import { generateEmbedding } from './embeddings';
import { DEFAULT_MODEL_ID, CHAT_CONTEXT_PROMPT_TEMPLATE } from '../constants';
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

const apiKeyName = process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30
  ? 'GOOGLE_GENERATIVE_AI_API_KEY_CHENG30'
  : 'GOOGLE_GENERATIVE_AI_API_KEY';

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

export async function generateBriefingWithGemini(
  articleData: any | any[],
  modelId: string = DEFAULT_MODEL_ID,
) {
  const [cleanModelId, keyAlias] = (modelId || '').split('@');
  const isSiliconFlow = cleanModelId.includes('/');

  const isBatch = Array.isArray(articleData);
  const articles = isBatch ? articleData : [articleData];

  const systemPromptTemplate = await getSystemPrompt();
  const payloadStr = JSON.stringify(articles);
  const fullPrompt = systemPromptTemplate.replace('{{payload}}', payloadStr);

  let text = '';
  let responseMetadata: any = {};

  if (isSiliconFlow) {
    const { generateSiliconFlow } = await import('./siliconflow');
    text = await generateSiliconFlow([{ role: 'user', content: fullPrompt }], cleanModelId);
    responseMetadata = { finishReason: 'STOP', safetyRatings: [] };
  } else {
    const { key: dynamicKey } = getApiKey(keyAlias);
    if (!dynamicKey) {
      throw new Error(`API Key (${keyAlias || 'Default'}) is not defined`);
    }

    const genAI = new GoogleGenerativeAI(dynamicKey);
    const model = genAI.getGenerativeModel({
      model: cleanModelId || DEFAULT_MODEL_ID,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    text = response.text();
    responseMetadata = {
      usageMetadata: response.usageMetadata,
      safetyRatings: response.candidates?.[0]?.safetyRatings,
      finishReason: response.candidates?.[0]?.finishReason,
      citationMetadata: response.candidates?.[0]?.citationMetadata,
    };
  }

  const cleanJson = cleanGeminiJson(text);

  try {
    const parsed = JSON.parse(cleanJson);
    const briefings = Array.isArray(parsed) ? parsed : [parsed];

    const processedBriefings = await Promise.all(
      briefings.map(async (briefing, index) => {
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
  } catch (error: any) {
    console.error('====================================================');
    console.error('GEMINI JSON PARSE FAILED');
    console.error('--- ERROR MESSAGE ---');
    console.error(error.message);
    console.error('--- CLEANED OUTPUT (attempted) ---');
    console.error(cleanJson);
    console.error('--- TOTAL LENGTH ---');
    console.error(text.length);
    console.error('--- RAW TEXT ---');
    console.log(text);
    console.error('====================================================');

    throw new Error(
      `Gemini JSON 解析失败 (Model: ${modelId}): ${error.message}. 请检查 Vercel 日志获取原始输出。`,
    );
  }
}

function getApiKey(alias?: string) {
  if (alias === 'alok') {
    return {
      key: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      name: 'ALOK',
    };
  }
  if (alias === 'cheng30') {
    return {
      key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30,
      name: 'CHENG30',
    };
  }
  return {
    key:
      process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30 || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    name: 'Auto (CHENG30/Default)',
  };
}

export async function chatWithGemini(
  messages: any[],
  articles: any[],
  query: string,
  useSearch: boolean = true,
  modelName: string = 'gemini-2.0-flash',
  keyAlias?: string,
): Promise<any> {
  const { key: dynamicKey, name: keyName } = getApiKey(keyAlias);
  if (!dynamicKey) throw new Error(`API Key (${keyAlias}) is not defined`);

  let effectiveModel = modelName;
  if (effectiveModel.includes('3-flash')) effectiveModel = 'gemini-2.0-flash';

  const chatSystemPromptRaw = await getChatSystemPrompt();
  const chatSystemPrompt = chatSystemPromptRaw.replace(/{{COUNT}}/g, articles.length.toString());
  console.log(
    `[Chat Prompt] Loaded (Gemini path) | length: ${chatSystemPrompt.length} | preview: ${chatSystemPrompt
     }`,
  );

  const genAI = new GoogleGenerativeAI(dynamicKey);
  const model = genAI.getGenerativeModel({
    model: effectiveModel,

    tools: useSearch ? [{ googleSearch: {} } as any] : [],
    systemInstruction: chatSystemPrompt,

    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ] as any,
  });

  const articleList =
    articles.length > 0
      ? articles
          .map((a, i) => {
            const dateStr = a.published ? new Date(a.published).toLocaleDateString() : 'N/A';
            const keywordsStr = Array.isArray(a.keywords) ? a.keywords.join(', ') : '';
            const verdictStr = a.verdict
              ? `Score:${a.verdict.score || '?'}/10 (${a.verdict.importance || 'Normal'})`
              : '';

            return `【文章索引：[${i + 1}]】
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

  const chat = model.startChat({
    history: messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  });

  const requestId = Math.random().toString(36).substring(7);
  console.log(
    `[Gemini Request] Start | ID: ${requestId} | Key: ${apiKeyName} | UseSearch: ${useSearch}`,
  );

  try {
    const result = await chat.sendMessageStream(contextPrompt);
    return result.stream;
  } catch (error: any) {
    console.error(
      `[chatWithGemini Error] ID: ${requestId} | Key: ${keyName} | Query: "${query.slice(0, 30)}..."`,
    );
    console.error('Full Error:', error.message);
    throw new Error(`AI 对话请求失败 (Key: ${keyName}): ${error.message}`);
  }
}

export async function reRankArticles(
  articles: any[],
  query: string,
  modelId: string = 'gemini-2.5-flash-lite-preview-09-2025',
  keyAlias?: string,
  topK: number = 10,
): Promise<string[]> {
  const { key: dynamicKey } = getApiKey(keyAlias);
  if (!dynamicKey || articles.length === 0) return [];

  const genAI = new GoogleGenerativeAI(dynamicKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

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
    const result = await model.generateContent(reRankPrompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return parsed.selected_ids || [];
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
