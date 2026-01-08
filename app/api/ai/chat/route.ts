import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseClient, verifyAdmin } from '@/lib/server/apiUtils';
import { generateEmbedding } from '@/lib/server/embeddings';
import { reRankArticles, chatWithGemini } from '@/lib/server/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  // 1. 严格管理员校验 (模仿搜索栏逻辑)
  if (!verifyAdmin(cookieStore)) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  try {
    const {
      messages,
      useSearch = true,
      model: requestedModel,
      isSmallTalkMode = false,
    } = await req.json();

    // 模型名称校验与降级 (根据实际可用列表纠偏)
    // 支持 @alias 后缀指定 API Key (e.g., gemini-2.0-flash@alok)
    const [requestedId, keyAlias] = (requestedModel || 'gemini-2.0-flash').split('@');
    let model = requestedId;

    if (model === 'gemini-3-flash') model = 'gemini-2.0-flash';
    // 移除将 1.5 模型自动升级到 latest 别名的逻辑，避免 1.5 自动升级到 2.5

    // 最终兜底
    // 最终兜底 (仅当不是 google 也不是 siliconflow 时才重置)
    // 简单的判断：如果包含 '/' 且不以 'gemini' 开头，通常是 SiliconFlow 模型
    // 或者更严谨地复用下方的 isSiliconFlow 判断逻辑，但 isSiliconFlow 定义在后面。
    // 这里简单放行包含 '/' 的模型 ID (SiliconFlow ID 通常是 "vendor/model")
    const looksLikeSiliconFlow = model.includes('/');

    if (!model.startsWith('gemini-') && !model.startsWith('gemma-') && !looksLikeSiliconFlow) {
      model = 'gemini-2.0-flash';
    }

    const lastUserMessage = messages[messages.length - 1]?.content;

    if (!lastUserMessage) {
      return NextResponse.json({ message: 'Message is required' }, { status: 400 });
    }

    // --- AI Router (Intelligent Intent Classification) ---
    // Decoupled Decision Layer to optimize latency and cost.
    const { classifyIntent, RouterIntent } = await import('@/lib/router');

    // Default intent is RAG_LOCAL (most conservative/rich behavior)
    let intent = RouterIntent.RAG_LOCAL;
    let routerReasoning = '';
    let modifiedQuery = '';

    // Only run router if we are NOT in Small Talk mode
    if (isSmallTalkMode) {
      intent = RouterIntent.DIRECT;
      routerReasoning = '用户手动开启闲聊模式，跳过意图识别。';
      console.log(`[Chat Router] Forced Small Talk Mode | Intent: ${intent}`);
    } else {
      try {
        const routerResult = await classifyIntent(lastUserMessage, messages);
        intent = routerResult.intent;
        routerReasoning = routerResult.reasoning;
        modifiedQuery = routerResult.modifiedQuery || '';
        console.log(
          `[Chat Router] Intent: ${intent} | ${routerReasoning} | Modified: ${modifiedQuery}`,
        );
      } catch (e) {
        console.warn('Router execution failed, falling back to RAG_LOCAL', e);
      }
    }

    // --- Execution Logic based on Intent ---
    let initialArticles = [];
    let finalArticles = [];

    // ONLY execute expensive Retrieval pipeline if strictly needed (RAG_LOCAL)
    if (intent === RouterIntent.RAG_LOCAL) {
      const supabase = getSupabaseClient();

      // Use modified query if available (better for RAG tags/keywords), otherwise raw query
      const retrievalQuery = modifiedQuery || lastUserMessage;

      // 2. 第一阶段召回：向量搜索 (Top 50, 阈值 0.5)
      // [重要] AI 助手全流程强制使用 'ai' 目的标记，以使用 CHENG30 KEY
      const queryEmbedding = await generateEmbedding(retrievalQuery, 'RETRIEVAL_QUERY', 'ai');
      const { data: searchResults, error: rpcError } = await supabase.rpc(
        'hybrid_search_articles',
        {
          query_text: retrievalQuery.trim(),
          query_embedding: queryEmbedding,
          match_count: 50,
        },
      );

      if (rpcError) throw rpcError;

      // 过滤掉相关性低于 0.5 的噪音
      const initialCandidates = (searchResults || []).filter((a: any) => (a.similarity || 0) > 0.5);

      // 3. 【新思路】重排：依据模型能力决定背景长度
      // Gemini 拥有百万级上下文，可以堆更多背景；SiliconFlow 以及小模型建议保持精简 (10篇)
      const isGemini = model.startsWith('gemini-');
      const targetLimit = isGemini ? 30 : 10;

      finalArticles = initialCandidates;
      if (initialCandidates.length > targetLimit) {
        const selectedIds = await reRankArticles(
          initialCandidates,
          lastUserMessage,
          undefined,
          keyAlias,
          targetLimit,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalArticles = initialCandidates.filter((a: any) => selectedIds.includes(a.id));
        // 兜底：如果重排失败或返回空，保证基础数量
        if (finalArticles.length === 0) finalArticles = initialCandidates.slice(0, targetLimit);
      }
      initialArticles = initialCandidates; // For logging candidates count
    } else {
      console.log(`[Chat Router] Skipping RAG pipeline for intent: ${intent}`);
    }

    let stream;
    const isSiliconFlow =
      model.startsWith('THUDM/') ||
      model.startsWith('deepseek-ai/') ||
      model.startsWith('Qwen/') ||
      model.startsWith('01-ai/'); // Future proofing

    // Force search ON if intent is SEARCH_WEB, otherwise respect user/default preference
    // If intent is DIRECT, we could force search OFF, but maybe user wants it?
    // Let's trust the Router Intent.
    // DIRECT -> useSearch = false (optimize)
    // SEARCH_WEB -> useSearch = true
    // RAG_LOCAL -> useSearch = false (focus on local) or true (hybrid)?
    // Let's keep useSearch as passed from frontend BUT override if DIRECT.

    let effectiveUseSearch = useSearch;
    if (intent === RouterIntent.DIRECT) effectiveUseSearch = false;
    if (intent === RouterIntent.SEARCH_WEB) effectiveUseSearch = true;

    if (isSiliconFlow) {
      const { streamSiliconFlow } = await import('@/lib/server/siliconflow');

      let enrichedMessages = [];

      if (intent === RouterIntent.DIRECT) {
        // --- DIRECT PATH: Simplified Persona (No RAG, No Strict Rules) ---
        // Preserves the core persona but removes the heavy constraints about citations/search.
        const SIMPLE_SYSTEM_PROMPT = `你是一名 Base 中国大陆的 **首席架构师/产品总监**。
你的风格：犀利、工程化、接地气、拒绝公关黑话。
请直接回答用户问题，不要使用 [N] 引用格式，也不要进行背景核对。`;

        enrichedMessages = [{ role: 'system', content: SIMPLE_SYSTEM_PROMPT }, ...messages];
      } else {
        // --- RAG/SEARCH PATH: Full Context & Strict Rules ---
        const { getChatSystemPrompt, CHAT_CONTEXT_PROMPT_TEMPLATE } =
          await import('@/lib/server/gemini');

        // 1. Prepare System Prompt (Persona)
        const chatSystemPromptRaw = await getChatSystemPrompt();
        const chatSystemPrompt = chatSystemPromptRaw.replace(
          /{{COUNT}}/g,
          finalArticles.length.toString(),
        );

        // 2. Prepare RAG Context (Articles + Query)
        const articleList =
          finalArticles.length > 0
            ? finalArticles
                .map((a: any, i: number) => {
                  const dateStr = new Date(a.published).toLocaleDateString();
                  const keywordsStr = Array.isArray(a.keywords) ? a.keywords.join(', ') : '';
                  const verdictStr = a.verdict
                    ? `Score:${a.verdict.score || '?'}/10 (${a.verdict.importance || 'Normal'})`
                    : '';
                  return `【文章索引：[${i + 1}]】\n标题: ${a.title}\n来源: ${a.sourceName || 'Unknown'} | ${verdictStr}\n日期: ${dateStr}\n分类: ${a.category || '未分类'} | 关键词: ${keywordsStr}\nTLDR: ${a.tldr || '无'}\n摘要: ${a.summary || '无'}\n技术亮点: ${a.highlights || '无'}\n犀利点评: ${a.critiques || '无'}\n市场观点: ${a.marketTake || '无'}`;
                })
                .join('\n\n---\n\n')
            : '（未匹配到相关本地文章）';

        const contextPrompt = CHAT_CONTEXT_PROMPT_TEMPLATE.replace(
          /{{COUNT}}/g,
          finalArticles.length.toString(),
        )
          .replace('{{ARTICLE_LIST}}', articleList)
          .replace('{{QUERY}}', lastUserMessage);

        // 3. Construct Enriched Messages
        enrichedMessages = [
          { role: 'system', content: chatSystemPrompt },
          ...messages.slice(0, -1),
          { role: 'user', content: contextPrompt },
        ];
      }

      stream = streamSiliconFlow(enrichedMessages, model, effectiveUseSearch);
    } else {
      stream = await chatWithGemini(
        messages,
        finalArticles,
        lastUserMessage,
        effectiveUseSearch,
        model,
        keyAlias,
      );
    }

    // 记录请求 ID 供排查
    const requestId = Math.random().toString(36).substring(7);
    console.log(
      `[API /chat] Request Received | ID: ${requestId} | Model: ${model} | Provider: ${isSiliconFlow ? 'SiliconFlow' : 'Google'} | Candidates: ${initialArticles?.length || 0}`,
    );

    // 5. SSE 响应封装
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 4.1 发送候选文章元数据 (用于内联显示标题和链接)
          const articleMetadata = finalArticles.map((a: any) => ({
            id: a.id,
            title: a.title,
            link: a.link,
            published: a.published,
          }));
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'metadata', articles: articleMetadata })}\n\n`,
            ),
          );

          let fullText = '';
          for await (const chunk of stream) {
            const text = chunk.text();
            if (text) {
              fullText += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`),
              );
            }
          }

          // Fix: Append Citation Statistics Programmatically
          if (fullText) {
            const uniqueCitations = new Set(fullText.match(/\[\d+\]/g) || []);
            const uniqueCount = uniqueCitations.size;
            const totalSources = finalArticles.length;

            if (totalSources > 0) {
              const footer = `\n\n[统计：检索 ${totalSources} 篇，引用了 ${uniqueCount} 篇]`;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: footer })}\n\n`),
              );
              fullText += footer;
            }
          }
          console.log(
            `[API /chat] Stream Complete | ID: ${requestId} | Length: ${fullText.length} | Preview: ${fullText.slice(-50)}`,
          );
        } catch (e) {
          console.error('SSE Stream Error:', e);
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    const isRateLimit = error.message?.includes('429') || error.message?.includes('Quota exceeded');
    const status = isRateLimit ? 429 : 500;

    // 尝试从错误信息中提取配额详情 (Google RPC 格式)
    let quotaInfo = undefined;
    try {
      if (isRateLimit) {
        const match = error.message.match(/quotaMetric: (.*)/);
        if (match) quotaInfo = { metric: match[1] };
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        message: isRateLimit ? 'Gemini 额度超限' : 'Internal Server Error',
        details: error.message,
        quota: quotaInfo,
      },
      { status },
    );
  }
}
