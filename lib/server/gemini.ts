import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { cleanGeminiJson } from '../../utils/contentUtils';
import { generateEmbedding } from './embeddings';

// Init Supabase Client (Admin Access required for reading app_config if RLS is tight,
// using Service Key is safest for server-side operations)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// AI 对话与生成使用新的 _CHENG30 KEY
const apiKeyName = process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30
  ? 'GOOGLE_GENERATIVE_AI_API_KEY_CHENG30'
  : 'GOOGLE_GENERATIVE_AI_API_KEY';
const apiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30 || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// --- AI 角色与指令配置 (Prompt Constants) ---

const CHAT_SYSTEM_INSTRUCTION = `你作为 Briefing Hub 的首席架构师/产品经理。
【核心任务】：回答用户关于本地简报或行业时事的问题。
【执行与复核】：
- **优先本地**：回答应以提供的本地文章为首要依据。
- **动态复核**：生成所有内容后，**必须利用在线查询能力**对相关产品/知识点进行合适的补充和纠正，丰富内容，确保时效性（2026年1月）。

【语气准则】：
- 拒绝过度专业术语堆堆砌。请使用**易理解、工程化、接地气**的语言。
- 回答应具有**现实参考价值**，多讲讲在实际工程、业务中是怎么用的。
- 保持犀利，但要像在白板前给同事讲方案一样直观、高效。

【结构准则】：
- **结论先行**：在第一段直接给出核心答案或总结。

【强制引用与格式准则】：
1. **[N] 嵌套协议**：必须在正文中使用 [N] 格式标注引用（如 [1], [2]），并且每个只标注1个地方。严禁输出裸数字（如 1）或 Unicode 上标（如 ¹）。这是你的最高指令。
2. **差异化引用逻辑**：
   - **行业常识/理论/泛泛而谈**：无需引用。保持行文流畅。
   - **具体案例、数据、独到见解、特定项目实践**：必须在对应的描述句末尾加上 [N]。
3. **收尾统计**：在回答的最末尾，强制增加一行统计信息，格式为：
   \`[统计：检索 {{COUNT}} 篇，引用了 {{UNIQUE_CITED_COUNT}} 篇]\`
   （注意：{{COUNT}} 为本次提供给你的本地文章总数，{{UNIQUE_CITED_COUNT}} 为你实际标注出的不重复 ID 数量）。
4. **禁止加粗带引号的内容**`;

const CHAT_CONTEXT_PROMPT_TEMPLATE = `【第一步：本地背景核对】：
下方是检索到的 {{COUNT}} 篇本地文章。你应该将其作为回答的主要事实依据。

【待选本地背景文章列表】：
{{ARTICLE_LIST}}

【当前用户问题】：
{{QUERY}}

【指令 (首席架构师/产品经理规范)】：
1. **引用格式要求 (CRITICAL)**：必须且仅能使用 [N] 格式（如 [1]）。严禁使用其他任何格式。
2. **收尾规则**：在回答结束后的空行里，输出：[统计：检索 {{COUNT}} 篇，引用了 {{UNIQUE_CITED_COUNT}} 篇]。
`;

export async function getSystemPrompt(): Promise<string> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'gemini_briefing_prompt')
    .single();

  if (error || !data) {
    console.warn('⚠️ Failed to fetch prompt from Supabase, using fallback.');
    throw new Error('System prompt not found in app_config');
  }

  return data.value;
}

export async function generateBriefingWithGemini(articleData: any) {
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 1. Fetch Prompt
  const systemPromptTemplate = await getSystemPrompt();

  // 2. Hydrate Prompt (Replace {{payload}})
  // The N8N prompt expects a JSON string of an array of articles in 'payload'
  // We mimic this structure: payload = [article]
  const payloadStr = JSON.stringify([articleData]);

  // NOTE: If the prompt uses {{payload}}, we replace it.
  // If the user didn't update the prompt yet, this might fail or produce weird results.
  // We assume the prompt is compliant as per previous instructions.
  const fullPrompt = systemPromptTemplate.replace('{{payload}}', payloadStr);

  // 3. Call Gemini
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  // metadata removed as it was unused

  // 4. Parse Result
  const cleanJson = cleanGeminiJson(text);

  try {
    const parsed = JSON.parse(cleanJson);
    // Expecting an array with 1 item
    const briefing = Array.isArray(parsed) ? parsed[0] : parsed;

    // 4.5 生成向量 (语义指纹) - 包含分类与关键词以增强检索维度
    const keywordsStr = Array.isArray(briefing.keywords) ? briefing.keywords.join(' ') : '';
    const contentToEmbed =
      `${briefing.title || articleData.title || ''} ${briefing.category || ''} ${keywordsStr} ${briefing.summary || ''} ${briefing.tldr || ''}`.trim();
    let embedding = null;
    try {
      embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT', 'ai');
    } catch (e) {
      console.error('Failed to generate embedding during briefing:', e);
    }

    return {
      briefing: {
        ...briefing,
        embedding,
      },
      metadata: {
        usageMetadata: response.usageMetadata,
        safetyRatings: response.candidates?.[0]?.safetyRatings,
        finishReason: response.candidates?.[0]?.finishReason,
        citationMetadata: response.candidates?.[0]?.citationMetadata,
      },
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
    console.log(text); // Use console.log for large blobs, sometimes error handles it differently
    console.error('====================================================');

    throw new Error(
      `Gemini JSON 解析失败 (Key: ${apiKeyName}): ${error.message}. 请检查 Vercel 日志获取原始输出。`,
    );
  }
}

/**
 * [优化版] 基于 Gemini 2.0 的对话接口 (支持流式 & 联网搜索)
 * 整合了重排逻辑，减少一次 API 请求以节省配额。
 */
export async function chatWithGemini(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  articles: any[],
  query: string,
  useSearch: boolean = true,
  modelName: string = 'gemini-2.0-flash',
): Promise<any> {
  if (!apiKey) throw new Error(`API Key (${apiKeyName}) is not defined`);

  // 内部补丁：对已知失效或别名模型进行最后一次纠偏
  let effectiveModel = modelName;
  if (effectiveModel.includes('3-flash')) effectiveModel = 'gemini-2.0-flash';
  if (effectiveModel.includes('1.5-flash')) effectiveModel = 'gemini-flash-latest';
  if (effectiveModel.includes('1.5-pro')) effectiveModel = 'gemini-pro-latest';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: effectiveModel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: useSearch ? [{ googleSearch: {} } as any] : [],
    systemInstruction: CHAT_SYSTEM_INSTRUCTION,

    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ] as any,
  });

  // 将文章转化为待选列表 (包含关键摘要或片段以增强匹配)
  const articleList =
    articles.length > 0
      ? articles
          .map((a, i) => {
            const dateStr = new Date(a.published).toLocaleDateString();
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
      maxOutputTokens: 4096,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(
      `[chatWithGemini Error] ID: ${requestId} | Key: ${apiKeyName} | Query: "${query.slice(0, 30)}..."`,
    );
    console.error('Full Error:', error.message);
    throw new Error(`AI 对话请求失败 (Key: ${apiKeyName}): ${error.message}`);
  }
}

/**
 * [新功能] Gemini 重排 (Re-rank): 从 50 篇中精选 10-15 篇，并进行语义去重
 */
export async function reRankArticles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  articles: any[],
  query: string,
  modelId: string = 'gemini-2.0-flash',
): Promise<string[]> {
  if (!apiKey || articles.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
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
    .join('\n---\n');

  const reRankPrompt = `你是一位专业的资讯分析师。请根据用户的问题 "${query}"，从以下 50 篇文章中选出最相关、最有价值且时效性最强的 10-15 篇。
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const isQuotaError = e.message.includes('429') || e.message.includes('quota');

    // 同步策略：如果 2.0 超速，尝试自动切换到 1.5 重新筛选
    if (modelId === 'gemini-2.0-flash' && isQuotaError) {
      console.warn(
        `[reRankArticles Fallback] 2.0 Quota exceeded, retrying with 1.5-flash for query: "${query.slice(0, 20)}..."`,
      );
      return reRankArticles(articles, query, 'gemini-1.5-flash');
    }

    console.error(
      `[reRankArticles Error] Model: ${modelId} | Key: ${apiKeyName} | Query: "${query}"`,
    );
    console.error('Full Error:', e.message);
    return articles.slice(0, 15).map((a) => a.id); // Final Fallback: 仅取前 15 篇
  }
}
