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
    const { messages, useSearch = true, model: requestedModel } = await req.json();

    // 模型名称校验与降级 (根据实际可用列表纠偏)
    let model = requestedModel || 'gemini-2.0-flash';

    if (model === 'gemini-3-flash') model = 'gemini-2.0-flash';
    // 移除将 1.5 模型自动升级到 latest 别名的逻辑，避免 1.5 自动升级到 2.5

    // 最终兜底
    if (!model.startsWith('gemini-') && !model.startsWith('gemma-')) {
      model = 'gemini-2.0-flash';
    }

    const lastUserMessage = messages[messages.length - 1]?.content;

    if (!lastUserMessage) {
      return NextResponse.json({ message: 'Message is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 2. 第一阶段召回：向量搜索 (Top 50, 阈值 0.5)
    // [重要] AI 助手全流程强制使用 'ai' 目的标记，以使用 CHENG30 KEY
    const queryEmbedding = await generateEmbedding(lastUserMessage, 'RETRIEVAL_QUERY', 'ai');
    const { data: initialArticles, error: rpcError } = await supabase.rpc(
      'hybrid_search_articles',
      {
        query_text: lastUserMessage.trim(),
        query_embedding: queryEmbedding,
        match_count: 50,
      },
    );

    if (rpcError) throw rpcError;

    // 过滤掉相关性低于 0.5 的噪音
    const initialCandidates = (initialArticles || []).filter((a: any) => (a.similarity || 0) > 0.5);

    // 3. 【新思路】重排：从 50 个初步结果中选出最相关的 10 个
    // 50 个背景太乱了，模型容易“由于信息过载”而放弃精确引用
    let finalArticles = initialCandidates;
    if (initialCandidates.length > 10) {
      const selectedIds = await reRankArticles(initialCandidates, lastUserMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      finalArticles = initialCandidates.filter((a: any) => selectedIds.includes(a.id));
      // 兜底：如果重排失败或返回空，至少保留前 10 个
      if (finalArticles.length === 0) finalArticles = initialCandidates.slice(0, 10);
    }

    const stream = await chatWithGemini(messages, finalArticles, lastUserMessage, useSearch, model);

    // 记录请求 ID 供排查
    const requestId = Math.random().toString(36).substring(7);
    console.log(
      `[API /chat] Request Received | ID: ${requestId} | Model: ${model} | Candidates: ${initialCandidates.length}`,
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
