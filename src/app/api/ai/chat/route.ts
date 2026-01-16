import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/domains/interaction/services/admin-auth';
import { orchestrateChat } from '@/domains/intelligence/services/chat-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Authentication Check (Domain-driven)
  if (!(await verifyAdmin())) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // 2. Logic Regression: Delegate the entire RAG pipeline to the domain orchestrator
    const { stream, finalArticles, model, isSiliconFlow } = await orchestrateChat(body);

    // 记录请求 ID 供排查 (Moved identifying parts to orchestrator or keep here for logs)
    const requestId = Math.random().toString(36).substring(7);
    console.log(
      `[API /chat] Request Handled | ID: ${requestId} | Model: ${model} | Provider: ${isSiliconFlow ? 'SiliconFlow' : 'Google'} | Context: ${finalArticles?.length || 0} articles`,
    );

    // 3. Presentation Layer: SSE Wrapper
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 3.1 Send metadata for client-side citation rendering
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
            `[API /chat] Stream Complete | ID: ${requestId} | Length: ${fullText.length}`,
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

    return NextResponse.json(
      {
        message: isRateLimit ? 'AI 额度超限' : 'Internal Server Error',
        details: error.message,
      },
      { status },
    );
  }
}
