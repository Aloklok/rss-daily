import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, verifyAdmin } from '@/lib/server/apiUtils';
import { cookies } from 'next/headers';
import { generateEmbedding } from '@/lib/server/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  if (!verifyAdmin(cookieStore)) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  if (!query) {
    return NextResponse.json({ message: 'Search query parameter is required.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // 1. 为搜索词生成向量
    const queryEmbedding = await generateEmbedding(query);

    // 2. 调用混合搜索 RPC
    // 我们按照规划：关键词优先（match_priority 1），语义推荐随后（match_priority 2）
    const { data, error } = await supabase
      .rpc('hybrid_search_articles', {
        query_text: query.trim(),
        query_embedding: queryEmbedding,
        match_count: 50, // 增加召回数量以保证混合效果
      })
      .range(from, to);

    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json(
        {
          message: 'Hybrid search failed via RPC',
          details: error.message,
        },
        { status: 500 },
      );
    }

    if (data && data.length > 0) {
      console.log(`🔍 Search Results for "${query}":`);
      data.forEach((item: any, index: number) => {
        console.log(
          `  [${index + 1}] Similarity: ${item.similarity?.toFixed(4)}, Priority: ${item.match_priority}, Title: ${item.title?.slice(0, 50)}`,
        );
      });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    console.error('Unexpected server error', err);
    return NextResponse.json(
      {
        message: 'Unexpected server error',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
