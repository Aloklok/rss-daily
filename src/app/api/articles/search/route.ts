import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { verifyAdmin } from '@/domains/interaction/services/admin-auth';
import { generateEmbedding } from '@/domains/intelligence/services/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const table = searchParams.get('table') || 'articles_view';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  if (!query) {
    return NextResponse.json({ message: 'Search query parameter is required.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Simple Search for English articles (No Vector Store yet)
  if (table === 'articles_en' || table === 'articles_view_en') {
    const { data: enData, error: enError } = await supabase
      .from('articles_view_en')
      .select('*')
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('published', { ascending: false })
      .range(from, to);

    if (enError) {
      return NextResponse.json({ message: enError.message }, { status: 500 });
    }

    return NextResponse.json({
      articles: enData || [],
      isFallback: true, // Always fallback logic for now
    });
  }

  try {
    let queryEmbedding: number[] | null = null;
    let embedErrorMsg: string | undefined = undefined;
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (embedErr: any) {
      console.warn(
        'Embedding generation failed, falling back to keyword-only search:',
        embedErr.message,
      );
      embedErrorMsg = embedErr.message;
    }

    // 2. 调用混合搜索 RPC
    // 我们按照规划：关键词优先（match_priority 1），语义推荐随后（match_priority 2）
    const { data, error } = await supabase
      .rpc('hybrid_search_articles', {
        query_text: query.trim(),
        query_embedding: queryEmbedding, // 可能是 null
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
      console.log(
        `🔍 Search Results for "${query}" (Embedding: ${queryEmbedding ? 'YES' : 'FALLBACK TO KEYWORD'}):`,
      );
      data.forEach((item: any, index: number) => {
        console.log(
          `  [${index + 1}] Similarity: ${item.similarity?.toFixed(4)}, Priority: ${item.match_priority}, Title: ${item.title?.slice(0, 50)}`,
        );
      });
    }

    // 3. 返回结构化响应
    return NextResponse.json({
      articles: data || [],
      isFallback: queryEmbedding === null,
      errorSnippet:
        queryEmbedding === null
          ? `Gemini 向量生成失败 (${embedErrorMsg})，已自动切换为关键词搜索。`
          : undefined,
    });
  } catch (err: unknown) {
    console.error('Unexpected server error during search:', err);
    return NextResponse.json(
      {
        message: 'Unexpected server error',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
