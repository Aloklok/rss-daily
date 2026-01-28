import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { FreshRSSItem } from '@/shared/types';
import { mapFreshItemToMinimalArticle } from '@/domains/reading/adapters/fresh-rss-mapper';
// import { toFullId } from '@/shared/utils/idHelpers';
import { cleanAIContent } from '@/domains/reading/utils/content';
import { BRIEFING_SECTIONS } from '@/domains/reading/constants';

// Define minimal structure for Supabase response
interface SupabaseArticle {
  id: string;
  title: string;
  source_name?: string;
  sourceName?: string;
  created_at?: string;
  n8n_processing_date?: string;
  verdict?: any;
  highlights?: string;
  critiques?: string;
  marketTake?: string;
  tldr?: string;
  category?: string;
  summary?: string;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const streamId = searchParams.get('value'); // Note: frontend sends 'value' as param name
  const n = searchParams.get('n');
  const c = searchParams.get('c');
  const table = searchParams.get('table'); // Support table param for i18n

  if (!streamId) {
    return NextResponse.json({ message: 'Stream ID is required.' }, { status: 400 });
  }

  const freshRss = getFreshRssClient();
  const safeStreamId = streamId.replace(/&/g, '%26');

  const params: Record<string, string> = {
    output: 'json',
    excludeContent: '1',
  };
  if (n) params.n = n;
  if (c) params.c = c;

  try {
    const data = await freshRss.get<{ items: FreshRSSItem[]; continuation?: string }>(
      `/stream/contents/${safeStreamId}`,
      params,
    );
    let articles = (data.items || []).map(mapFreshItemToMinimalArticle);

    // If table is provided (e.g., 'articles_view_en'), fetch localized metadata from Supabase
    if (table && articles.length > 0) {
      try {
        const supabase = getSupabaseClient();
        const articleIds = articles.map((a) => a.id);

        // Use 'as any' for table name to allow dynamic table selection
        const { data: dbArticles, error } = await supabase
          .from(table as any)
          .select('*')
          .in('id', articleIds);

        if (!error && dbArticles) {
          // Create a map for fast lookup
          const dbMap = new Map<string, SupabaseArticle>(
            dbArticles.map((dba: any) => [dba.id, dba]),
          );

          // Merge localized data back into articles
          articles = articles.map((article) => {
            const dbArticle = dbMap.get(String(article.id));

            if (dbArticle) {
              return {
                ...article,
                title: dbArticle.title || article.title, // Use localized title
                sourceName: dbArticle.source_name || article.sourceName,
                // Map AI fields
                tldr: cleanAIContent(dbArticle.tldr || article.tldr),
                summary: cleanAIContent(dbArticle.summary || article.summary),
                category: cleanAIContent(dbArticle.category || article.category),
                highlights: cleanAIContent(dbArticle.highlights || article.highlights),
                critiques: cleanAIContent(dbArticle.critiques || article.critiques),
                marketTake: cleanAIContent(dbArticle.marketTake || article.marketTake),
                verdict: dbArticle.verdict ||
                  article.verdict || { importance: BRIEFING_SECTIONS.REGULAR, score: 0 },
                // Ensure we preserve the ID structure
              };
            }
            return article;
          });
        }
      } catch (dbError) {
        console.error('Failed to fetch localized metadata from Supabase:', dbError);
        // Fallback to FreshRSS data (already in 'articles')
      }
    }

    return NextResponse.json({
      articles,
      continuation: data.continuation,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching from FreshRSS', error: errorMessage },
      { status: 500 },
    );
  }
}
