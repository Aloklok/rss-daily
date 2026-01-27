/**
 * 文章翻译服务
 * 使用硅基流动的 Qwen3-8B 模型将中文文章翻译为英文
 */
import { generateSiliconFlow } from './siliconflow';
import { DEFAULT_TRANSLATION_MODEL } from '../constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 客户端（延迟初始化，避免脚本模式下环境变量未加载）
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

/**
 * 需要翻译的文章字段
 */
export interface ArticleToTranslate {
  id: string;
  title: string;
  category: string;
  summary: string;
  tldr: string;
  highlights: string;
  critiques: string;
  marketTake: string;
  keywords: string[];
  // 元数据字段（完全复制方案）
  link?: string;
  sourceName?: string;
  published?: string;
  n8n_processing_date?: string;
  verdict?: any;
}

/**
 * 翻译后的文章结构
 */
export interface TranslatedArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  tldr: string;
  highlights: string;
  critiques: string;
  marketTake: string;
  keywords: string[];
}

/**
 * 构建翻译 Prompt
 * 要求模型返回结构化 JSON
 */
function buildTranslationPrompt(article: ArticleToTranslate): string {
  return `You are a professional software architect translating a technical briefing from Chinese to English.

### STYLE GUIDELINES:
1. **Modern & Clear Technical English**: Use professional yet accessible language. Avoid overly academic or archaic vocabulary
2. **Formatting (CRITICAL)**: **STRICTLY FOLLOW** the original Markdown formatting (bolding, lists, etc.) from the source.
   - DO NOT add extra bolding that isn't in the original text. 
   - Keep titles clean (usually no bolding).
3. **Accuracy**: Ensure technical terms are translated correctly (e.g., "DNS resolution", "Service Mesh")
4. **SELF-CHECK (2nd Pass)**:
   - **Translation Quality**: Scan for mistranslations or awkward phrasing.
   - **No Chinese**: Ensure 100% English - zero Chinese characters or punctuation.
   - **Persona**: Maintain the "Senior Architect" voice (sharp, professional).
   - **Completeness**: No content loss during translation.
   - **no empty field**: if the orignal text is none,then set "none".
### SOURCE CONTENT:
Title: ${article.title || ''}
Category: ${article.category || ''}
TLDR: ${article.tldr || ''}
Summary: ${article.summary || ''}
Highlights: ${article.highlights || ''}
Critiques: ${article.critiques || ''}
Market Take: ${article.marketTake || ''}
Keywords: ${(article.keywords || []).join(', ')}

### OUTPUT FORMAT:
Return ONLY a valid JSON object in this exact format (no additional text, no code blocks):
{
  "title": "...",
  "category": "...",
  "tldr": "...",
  "summary": "...",
  "highlights": "...",
  "critiques": "...",
  "marketTake": "...",
  "keywords": ["...", "..."]
}`;
}

/**
 * 解析翻译结果
 */
function parseTranslationResult(result: string, articleId: string): TranslatedArticle | null {
  try {
    // Qwen3 可能输出 <think> 标签，需要清理
    let cleanResult = result;
    if (result.includes('</think>')) {
      cleanResult = result.split('</think>').pop()?.trim() || result;
    }

    // 提取 JSON 部分
    const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[Translate] No valid JSON found for article ${articleId}`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      id: articleId,
      title: parsed.title || '',
      category: parsed.category || '',
      summary: parsed.summary || '',
      tldr: parsed.tldr || '',
      highlights: parsed.highlights || '',
      critiques: parsed.critiques || '',
      marketTake: parsed.marketTake || '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch (e: any) {
    console.error(`[Translate] JSON parse failed for article ${articleId}:`, e.message);
    return null;
  }
}

/**
 * 助手函数：清理 AI 返回的 JSON 字符串中常见的格式错误
 */
function cleanJsonString(str: string): string {
  return str
    .replace(/,\s*\]/g, ']') // 移除数组末尾多余逗号
    .replace(/,\s*\}/g, '}') // 移除对象末尾多余逗号
    .replace(/(?:\r\n|\r|\n)/g, ' ') // 将换行替换为空格（防止 JSON.parse 失败）
    .replace(/\s+/g, ' ') // 压缩多余空格
    .trim();
}

/**
 * 构建批量翻译 Prompt
 */
function buildBatchTranslationPrompt(articles: ArticleToTranslate[]): string {
  const sourceContent = articles
    .map(
      (article) => `
--- ARTICLE ID: ${article.id} ---
Title: ${article.title || ''}
Category: ${article.category || ''}
TLDR: ${article.tldr || ''}
Summary: ${article.summary || ''}
Highlights: ${article.highlights || ''}
Critiques: ${article.critiques || ''}
Market Take: ${article.marketTake || ''}
Keywords: ${(article.keywords || []).join(', ')}
`,
    )
    .join('\n');

  return `I have provided ${articles.length} articles below. Your task is to translate each one from Chinese to English while preserving its unique identifier and following the technical architect style.

### CRITICAL RULES:
1. **ID PERSISTENCE**: You MUST use the exact "id" provided for each article.
2. **ONE-TO-ONE MAPPING**: Return exactly ${articles.length} objects.
3. **NO THINKING**: DO NOT include any reasoning, thinking process, or preamble. Return ONLY the JSON object.
4. **STYLE**: Modern & Clear Technical English. Follow original Markdown formatting.
5. **NULL HANDLING**: If a source field is empty or contains "无" (None), translate it as "None" in the output JSON. DO NOT return an empty string or null.
6. **SELF-CHECK (2nd Pass)**: 
   - **Quality**: Scan each article for mistranslations, awkward phrasing, or lost technical nuance.
   - **NO CHINESE**: Ensure ZERO Chinese characters or symbols remain in ANY field.
   - **Voice**: Maintain the "Senior Architect" persona - professional, concise, and insightful.
   - **Integrity**: Verify no fields were left untranslated or skipped.

### SOURCE CONTENT:
${sourceContent}

### OUTPUT FORMAT:
Return a valid JSON object with an "articles" key containing the array of translated articles. 
Ensure ALL fields from the source Article (id, title, category, tldr, summary, highlights, critiques, marketTake, keywords) are included in each object.

Schema Example:
{
  "articles": [
    {
      "id": "original-id",
      "title": "Translated Title",
      "category": "Category",
      "tldr": "English TLDR",
      "summary": "English Summary",
      "highlights": "English Highlights",
      "critiques": "English Critiques",
      "marketTake": "English Market Take",
      "keywords": ["key1", "key2"]
    }
  ]
}`;
}

/**
 * 解析批量翻译结果
 */
function parseBatchTranslationResult(result: string): TranslatedArticle[] | null {
  try {
    let cleanResult = result;
    if (result.includes('</think>')) {
      cleanResult = result.split('</think>').pop()?.trim() || result;
    }

    const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const rawJson = jsonMatch[0];
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch (_e) {
      const repaired = cleanJsonString(rawJson);
      parsed = JSON.parse(repaired);
    }

    // Handle both wrapped format and direct array for compatibility
    const list = parsed.articles || (Array.isArray(parsed) ? parsed : [parsed]);
    return Array.isArray(list) ? list : [list];
  } catch (e: any) {
    console.error(`[Translate] Batch JSON parse failed:`, e.message);
    return null;
  }
}

/**
 * 翻译单篇文章
 */
export async function translateArticle(
  article: ArticleToTranslate,
  modelId: string = DEFAULT_TRANSLATION_MODEL,
): Promise<TranslatedArticle | null> {
  const prompt = buildTranslationPrompt(article);
  try {
    const result = await generateSiliconFlow([{ role: 'user', content: prompt }], modelId);
    return parseTranslationResult(result, article.id);
  } catch (e: any) {
    console.error(`[Translate] API call failed for article ${article.id}:`, e.message);
    return null;
  }
}

/**
 * 翻译并保存到数据库 (单篇)
 */
export async function translateAndSave(
  article: ArticleToTranslate,
  modelId: string = DEFAULT_TRANSLATION_MODEL,
): Promise<{ success: boolean; error?: string }> {
  return translateBatchAndSave([article], modelId);
}

/**
 * 批量翻译并保存 (核心方法)
 */
export async function translateBatchAndSave(
  articles: ArticleToTranslate[],
  modelId: string = DEFAULT_TRANSLATION_MODEL,
): Promise<{ success: boolean; count: number; error?: string }> {
  if (articles.length === 0) return { success: true, count: 0 };

  const prompt = buildBatchTranslationPrompt(articles);

  try {
    const aiResult = await generateSiliconFlow(
      [
        {
          role: 'system',
          content:
            'You are a professional software architect and technical translator. Always output valid JSON objects in the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      modelId,
      16000,
      true, // Enable JSON mode
    );
    const translatedList = parseBatchTranslationResult(aiResult);

    if (!translatedList || translatedList.length === 0) {
      return { success: false, count: 0, error: 'AI returned empty or invalid results' };
    }

    // 准备数据库记录并进行 ID 去重
    const seenIds = new Set<string>();
    const recordsToUpsert = translatedList
      .map((translated) => {
        if (!translated.id || seenIds.has(translated.id)) return null;

        const original = articles.find((a) => String(a.id) === String(translated.id));
        if (!original) return null;

        seenIds.add(translated.id);

        // 严格字段校验：确保关键内容字段不为空
        const requiredFields = [
          'title',
          'summary',
          'tldr',
          'highlights',
          'critiques',
          'marketTake',
        ];
        const hasEmptyField = requiredFields.some((field) => {
          const val = (translated as any)[field];
          return !val || val.trim() === '' || val.toLowerCase() === 'empty' || val === '无';
        });

        if (hasEmptyField) {
          console.warn(
            `[Translate] Skipping article ${original.id} due to empty fields in AI response.`,
          );
          return null;
        }

        // 严格：自查是否包含中文字符 (Regex check for Chinese)
        const containsChinese = requiredFields.some((field) => {
          const val = (translated as any)[field];
          return /[\u4e00-\u9fa5]/.test(val || '');
        });

        if (containsChinese) {
          console.warn(
            `[Translate] Skipping article ${original.id} because it contains Chinese characters.`,
          );
          return null;
        }

        return {
          id: original.id,
          title: translated.title,
          summary: translated.summary,
          tldr: translated.tldr,
          highlights: translated.highlights,
          critiques: translated.critiques,
          marketTake: translated.marketTake,
          keywords: translated.keywords,
          category: translated.category || original.category,
          // 核心架构改进：不再持久化冗余元数据。
          // 仅存储翻译内容和任务信息，元数据（link, sourceName, published 等）
          // 将通过数据库视图 articles_view_en 从主表动态关联获取。
          model_used: modelId,
        };
      })
      .filter(Boolean);

    if (recordsToUpsert.length === 0) {
      return { success: false, count: 0, error: 'No matching articles found in AI response' };
    }

    // 使用 upsert 批量存入
    const { error: dbError } = await getSupabase()
      .from('articles_en')
      .upsert(recordsToUpsert, { onConflict: 'id' });

    if (dbError) {
      return { success: false, count: 0, error: dbError.message };
    }

    return { success: true, count: recordsToUpsert.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message };
  }
}

/**
 * 批量翻译（由于接口变更，包装一下兼容旧脚本调用，但建议直接使用 translateBatchAndSave）
 */
export async function translateBatch(
  articles: ArticleToTranslate[],
  modelId: string = DEFAULT_TRANSLATION_MODEL,
  batchSize: number = 20,
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < articles.length; i += batchSize) {
    const chunk = articles.slice(i, i + batchSize);
    const result = await translateBatchAndSave(chunk, modelId);
    if (result.success) {
      successCount += result.count;
    } else {
      failedCount += chunk.length;
      console.error(`[Translate] Batch failed: ${result.error}`);
    }
  }

  return { success: successCount, failed: failedCount };
}
