/**
 * 文章翻译服务
 * 使用硅基流动的 Qwen3-8B 模型将中文文章翻译为英文
 */
import { generateSiliconFlow } from './siliconflow';
import { DEFAULT_TRANSLATION_MODEL, HUNYUAN_TRANSLATION_MODEL } from '../constants';
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

// Migrated constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * 助手函数：带指数退避的重试封装
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (error: any, attempt: number) => void,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (onRetry) onRetry(e, attempt);
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
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
 * 核心翻译指令（由单篇和批量翻译共用，确保逻辑对齐）
 */
const COMMON_TRANSLATION_RULES = `
### STYLE & STYLE GUIDELINES:
1. **Persona**: You are a professional software architect. Maintain a "Senior Architect" voice (sharp, professional, concise, and insightful).
2. **Modern & Clear Technical English**: Use professional yet accessible language. Avoid overly academic or archaic vocabulary.
3. **Accuracy**: Ensure technical terms are translated correctly (e.g., "DNS resolution", "Service Mesh").
4. **Strict Formatting (CRITICAL)**: **STRICTLY FOLLOW** the original Markdown formatting (bolding, lists, etc.) from the source.
   - If a specific term or phrase is **bolded** in the source, ensure the **corresponding English translation** is also **bolded**.
   - DO NOT add extra bolding that isn't in the original text.

### CRITICAL RULES:
1. **NO CHINESE (STRICT)**: Ensure 100% English - zero Chinese characters or punctuation in ANY field.
   - **Vendor Names**: All Chinese terms, especially vendor names (e.g., "阿里云", "腾讯云", "字节跳动"), MUST be translated into their standard English forms (e.g., "Alibaba Cloud", "Tencent Cloud", "ByteDance").
   - **Leakage Patterns**: NEVER leak phrases like "所谓的" (translate to "so-called") or keeping Chinese names in parentheses.
2. **NULL & EMPTY HANDLING**: If a source field is null, undefined, an empty string, or contains "无" (None), you MUST translate it as the string "None" in the output JSON. DO NOT return an empty string or skip the field.

### SELF-CHECK (2nd Pass):
- **Quality**: Scan each article for mistranslations, awkward phrasing, or lost technical nuance.
- **Integrity**: Verify no fields were left untranslated, skipped, or contain Chinese characters.
`;

/**
 * 构建单篇翻译 Prompt
 */
function buildTranslationPrompt(article: ArticleToTranslate): string {
  return `You are translating a technical briefing from Chinese to English.

${COMMON_TRANSLATION_RULES}

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
 * 构建混元标记位翻译 Prompt（不使用 JSON，避免引号冲突）
 */
function buildHunyuanTranslationPrompt(article: ArticleToTranslate): string {
  const sourceText = `[[ID]]: ${article.id}
[[TITLE]]: ${article.title || ''}
[[CATEGORY]]: ${article.category || ''}
[[TLDR]]: ${article.tldr || ''}
[[SUMMARY]]: ${article.summary || ''}
[[HIGHLIGHTS]]: ${article.highlights || ''}
[[CRITIQUES]]: ${article.critiques || ''}
[[MARKET_TAKE]]: ${article.marketTake || ''}
[[KEYWORDS]]: ${(article.keywords || []).join(', ')}`;

  return `You are a professional software architect translating a technical briefing from Chinese to English.
Your task is to translate the content following each [[KEY]]: marker.

${COMMON_TRANSLATION_RULES}

### Hunyuan Specific Rule (CRITICAL):
1. **NO JSON**: Do NOT use curly braces \`{\` or \`}\`. Do NOT use "key": "value" syntax.
2. **FORMAT**: Use ONLY the \`[[KEY]]: content\` format provided in the input.
3. **NO BOLDING MARKERS**: Do NOT bold the markers. Write exactly \`[[TITLE]]:\`, NOT \`**[[TITLE]]**:\` or \`[[TITLE**:\`.
4. **NO EMBELLISHMENTS**: Do not add any extra text, conversational filler, or Markdown code blocks.
5. **SYNTAX**: Ensure there is a newline between each [[KEY]].

### INPUT:
${sourceText}

### OUTPUT:`;
}

/**
 * 解析混元标记位返回结果
 */
function parseHunyuanResult(result: string): TranslatedArticle[] | null {
  const extracted: any = {};

  try {
    // 移除可能的 <think> 标签内容
    let cleanResult = result;
    if (result.includes('</think>')) {
      cleanResult = result.split('</think>').pop()?.trim() || result;
    }

    // 为鲁棒性，定义关键字匹配模式（处理可能出现的拼写错误或格式变体）
    const keyPatterns: Record<string, string> = {
      ID: 'ID',
      TITLE: 'TITLE',
      CATEGORY: 'CATEGORY',
      TLDR: 'TLDR',
      SUMMARY: 'SUMMARY',
      HIGHLIGHTS: 'HIGHLIGHTS',
      CRITIQUES: 'CRITIQUES|CRITICUES', // 容忍常见的 AI 拼写错误
      MARKET_TAKE: 'MARKET_TAKE',
      KEYWORDS: 'KEYWORDS',
    };

    for (const [dataKey, pattern] of Object.entries(keyPatterns)) {
      // 极其宽容的正则：
      // 1. 支持 [[KEY]]、[[KEY**、[[KEY】、"KEY":、KEY: 等各种变体
      // 2. 使用 [^:：]* 跳过关键字到冒号之间的任何干扰字符
      // 3. 使用前瞻断言查找下一个关键字（锚定关键字后必须跟有冒号或闭合标记，防止匹配到正文中的单词如 summarizes）
      const regex = new RegExp(
        `(?:\\[\\[|")?\\s*(?:${pattern})(?:[^:：]*?)\\s*[:：]\\s*([\\s\\S]*?)(?=\\s*(?:\\[\\[|"(?:${Object.values(keyPatterns).join('|')})")\\s*[^:：]*?[:：]|$)`,
        'i',
      );
      const match = cleanResult.match(regex);

      if (match) {
        let value = match[1].trim();
        // 清理由于执意返回 JSON 可能带有的包围引号
        if (value.startsWith('"')) value = value.substring(1);
        if (value.endsWith('"') || value.endsWith('",')) {
          value = value.replace(/",?$/, '');
        }
        extracted[dataKey] = value.trim();
      }
    }

    if (!extracted.ID) return null;

    return [
      {
        id: extracted.ID,
        title: extracted.TITLE || '',
        category: extracted.CATEGORY || '',
        tldr: extracted.TLDR || '',
        summary: extracted.SUMMARY || '',
        highlights: extracted.HIGHLIGHTS || '',
        critiques: extracted.CRITIQUES || '',
        marketTake: extracted.MARKET_TAKE || '',
        keywords: extracted.KEYWORDS
          ? extracted.KEYWORDS.split(',').map((k: string) => k.trim())
          : [],
      },
    ];
  } catch (e: any) {
    console.error(`[Translate] Hunyuan tag parse failed:`, e.message);
    return null;
  }
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
    .replace(/"\s*(?="[\w]+"\s*:)/g, '", ') // 修复字符串值后遗漏逗号的情况: "val" "key": -> "val", "key":
    .replace(/(?:\r\n|\r|\n)/g, ' ') // 将换行替换为空格（防止 JSON.parse 失败）
    .replace(/\s+/g, ' ') // 压缩多余空格
    .trim();
}

/**
 * 构建批量翻译 Prompt
 */
export function buildBatchTranslationPrompt(articles: ArticleToTranslate[]): string {
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

  return `## BATCH TRANSLATION REQUEST: ${articles.length} ARTICLES

You MUST translate all ${articles.length} articles provided below.

${COMMON_TRANSLATION_RULES}

### BATCH EXECUTION RULES:
1. **ARTICLE COUNT**: You are translating EXACTLY ${articles.length} articles.
2. **ONE-TO-ONE MAPPING**: Your output JSON must contain exactly ${articles.length} items in the "articles" array.
3. **ID PERSISTENCE**: You MUST use the exact "id" provided for each article.

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
      "category": "English Category",
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
      try {
        parsed = JSON.parse(repaired);
      } catch (innerError: any) {
        console.error(`[Translate] REPAIR FAILED. Repaired string:`, repaired);
        throw innerError;
      }
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
  modelId: string = HUNYUAN_TRANSLATION_MODEL,
): Promise<TranslatedArticle | null> {
  const isHunyuan = modelId.includes('Hunyuan');
  const prompt = isHunyuan
    ? buildHunyuanTranslationPrompt(article)
    : buildTranslationPrompt(article);
  const jsonMode = !isHunyuan; // Hunyuan-MT doesn't support json_mode
  const enableThinking = !isHunyuan; // Hunyuan-MT doesn't support enable_thinking

  try {
    const result = await generateSiliconFlow(
      [{ role: 'user', content: prompt }],
      modelId,
      4096, // Assuming 4096 is the default max_tokens for single article translation
      jsonMode,
      enableThinking,
    );
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
  modelId: string = HUNYUAN_TRANSLATION_MODEL,
): Promise<{ success: boolean; error?: string }> {
  return translateBatchAndSave([article], modelId);
}

/**
 * 批量翻译并保存 (核心方法 - 包含重试逻辑)
 */
export async function translateBatchAndSave(
  articles: ArticleToTranslate[],
  modelId: string = DEFAULT_TRANSLATION_MODEL,
): Promise<{ success: boolean; count: number; error?: string }> {
  if (articles.length === 0) return { success: true, count: 0 };

  // 1. 数据清洗与预处理：确保 AI 接收到明确的信号（将 null/空值 引导为 "无"）
  const sanitizedArticles = articles.map((article) => {
    const s = (val: any) =>
      !val || (typeof val === 'string' && val.trim() === '') || val === '[]' ? '无' : val;

    return {
      ...article,
      title: s(article.title),
      category: s(article.category),
      summary: s(article.summary),
      tldr: s(article.tldr),
      highlights: s(article.highlights),
      critiques: s(article.critiques),
      marketTake: s(article.marketTake),
    };
  });

  const isHunyuan = modelId.includes('Hunyuan');
  const prompt = isHunyuan
    ? buildHunyuanTranslationPrompt(sanitizedArticles[0])
    : buildBatchTranslationPrompt(sanitizedArticles);
  const jsonMode = !isHunyuan;
  const enableThinking = !isHunyuan;

  try {
    return await withRetry(
      async () => {
        const aiMessages: any[] = [{ role: 'user', content: prompt }];

        // Only add system prompt for non-Hunyuan (to be safe and consistent with previous manual tests)
        if (!isHunyuan) {
          aiMessages.unshift({
            role: 'system',
            content:
              'You are a professional software architect and technical translator. Always output valid JSON objects in the requested schema.',
          });
        }

        const aiResult = await generateSiliconFlow(
          aiMessages,
          modelId,
          16000,
          jsonMode,
          enableThinking,
        );

        const translatedList = isHunyuan
          ? parseHunyuanResult(aiResult)
          : parseBatchTranslationResult(aiResult);

        if (!translatedList || translatedList.length === 0) {
          throw new Error('AI returned empty or invalid results (Parse Failure)');
        }

        // 准备数据库记录并进行 ID 去重
        const seenIds = new Set<string>();
        const recordsToUpsert = [];
        const failedIds = [];

        for (const translated of translatedList) {
          if (!translated.id || seenIds.has(translated.id)) continue;

          const original = articles.find((a) => String(a.id) === String(translated.id));
          if (!original) continue;

          seenIds.add(translated.id);

          // 核心校验逻辑：对齐 backfill 脚本的严谨性
          const requiredFields = [
            'title',
            'category',
            'summary',
            'tldr',
            'highlights',
            'critiques',
            'marketTake',
          ];

          // 1. 空值校验 (对于核心字段标题和摘要必须有内容)
          const hasEmptyField = requiredFields.some((field) => {
            const val = (translated as any)[field];
            const isOptionalInOutput =
              field === 'highlights' || field === 'critiques' || field === 'marketTake';

            const isEmpty = !val || typeof val !== 'string' || val.trim() === '';
            const isInvalidValue =
              val === '无' || (typeof val === 'string' && val.toLowerCase() === 'empty');

            // 如果是可选字段列表中的，允许 AI 返回空（或者我们能接受空）
            if (isOptionalInOutput && isEmpty) return false;

            return isEmpty || isInvalidValue;
          });

          // 2. 中文校验 (无补救措施，严格要求 AI 遵从翻译指令)
          const containsChinese = requiredFields.some((field) => {
            const val = (translated as any)[field];
            return typeof val === 'string' && /[\u4e00-\u9fa5]/.test(val || '');
          });

          if (hasEmptyField || containsChinese) {
            // const reason = hasEmptyField ? 'Empty Field' : 'Contains Chinese';
            if (containsChinese) {
              const failingField = requiredFields.find((field) => {
                const val = (translated as any)[field];
                return typeof val === 'string' && /[\u4e00-\u9fa5]/.test(val || '');
              });
              const failingValue = (translated as any)[failingField || ''];
              console.warn(
                `[Translate] Validation failed (Contains Chinese): Field "${failingField}" contains: "${failingValue}"`,
              );
            }
            if (hasEmptyField) {
              const failingField = requiredFields.find((field) => {
                const val = (translated as any)[field];
                const isOptional =
                  field === 'highlights' || field === 'critiques' || field === 'marketTake';
                if (isOptional) return false;
                return (
                  !val ||
                  typeof val !== 'string' ||
                  val.trim() === '' ||
                  val === '无' ||
                  val.toLowerCase() === 'empty'
                );
              });
              console.warn(
                `[Translate] Validation failed (Empty Field): Field "${failingField}" for article ${original.id}`,
              );
            }
            failedIds.push(original.id);
            continue;
          }

          recordsToUpsert.push({
            id: original.id,
            title: translated.title,
            summary: translated.summary,
            tldr: translated.tldr,
            highlights: translated.highlights,
            critiques: translated.critiques,
            marketTake: translated.marketTake,
            keywords: translated.keywords,
            category: translated.category || original.category,
            model_used: modelId,
          });
        }

        // 语义校验触发重试：如果处理后的文章数量少于原本请求的数量，且还没有达到最大重试次数，则抛错触发重试
        if (recordsToUpsert.length < articles.length) {
          const missingCount = articles.length - recordsToUpsert.length;
          throw new Error(
            `Semantic validation failed: ${missingCount} articles failed quality check (${failedIds.join(', ')})`,
          );
        }

        // 使用 upsert 批量存入
        const { error: dbError } = await getSupabase()
          .from('articles_en')
          .upsert(recordsToUpsert, { onConflict: 'id' });

        if (dbError) {
          throw new Error(`Supabase Upsert Failure: ${dbError.message}`);
        }

        return { success: true, count: recordsToUpsert.length };
      },
      (error, attempt) => {
        console.warn(`[Translate API] Attempt ${attempt} failed: ${error.message}. Retrying...`);
      },
    );
  } catch (e: any) {
    console.error(`[Translate API] All ${MAX_RETRIES} attempts failed:`, e.message);
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
