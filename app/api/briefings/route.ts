import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/apiUtils';
import { Article } from '@/types'; // Adjust path as needed
import { shanghaiDateSlotToUtcWindow } from '@/utils/dateUtils';

export const dynamic = 'force-dynamic'; // Ensure this runs dynamically

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const slot = searchParams.get('slot');
  const articleIdsParam = searchParams.get('articleIds');

  // 1. Query by IDs
  if (articleIdsParam) {
    const supabase = getSupabaseClient();
    // Handle array format if passed as multiple params, but standard URLSearchParams handles duplicates differently.
    // Here we assume comma-separated or multiple keys. Next.js searchParams.getAll('articleIds') handles multiple keys.
    // But the original code might expect 'id1,id2' or repeated params.
    // Let's support both: getAll and comma split.
    let ids: string[] = searchParams.getAll('articleIds');
    // Removed comma splitting because some IDs (e.g. FreshRSS tag IDs) contain commas.
    // The client sends multiple 'articleIds' params which getAll handles correctly.

    // If still empty, check if it was passed as 'articleIds[]'
    if (ids.length === 0) {
      const idsBrackets = searchParams.getAll('articleIds[]');
      if (idsBrackets.length > 0) ids = idsBrackets;
    }

    if (ids.length > 0) {
      const { data: articles, error } = await supabase.from('articles').select('*').in('id', ids);

      if (error) {
        console.error('Error fetching from Supabase by IDs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const articlesById = (articles || []).reduce(
        (acc, article) => {
          acc[article.id] = article;
          return acc;
        },
        {} as Record<string, Article>,
      );

      return NextResponse.json(articlesById);
    }
  }

  // 2. Query by Date
  if (!date) {
    return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  let query = supabase.from('articles').select('*');

  // Use unified Shanghai date + slot → UTC window mapping
  const { startIso, endIso } = shanghaiDateSlotToUtcWindow(date, slot as any);

  query = query.gte('n8n_processing_date', startIso);
  query = query.lte('n8n_processing_date', endIso);

  const { data: articles, error } = await query;

  if (error) {
    console.error('Error fetching from Supabase by date:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({});
  }

  const uniqueById = new Map<string | number, Article>();
  articles.forEach((a: Article) => {
    uniqueById.set(a.id, a);
  });
  const deduped = Array.from(uniqueById.values());

  const groupedArticles: { [key: string]: Article[] } = {
    重要新闻: [],
    必知要闻: [],
    常规更新: [],
  };

  deduped.forEach((article) => {
    const importance = article.verdict?.importance || '常规更新';
    if (groupedArticles[importance]) {
      groupedArticles[importance].push(article);
    } else {
      groupedArticles['常规更新'].push(article);
    }
  });

  for (const importance in groupedArticles) {
    groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
  }

  if (searchParams.get('include_state') === 'true') {
    const { attachArticleStates } = await import('@/lib/server/dataFetcher');

    // Flatten, attach, and reconstruct would be expensive if we break the grouping structure.
    // Instead, let's just iterate over the keys.
    const allArticles: Article[] = [];
    Object.values(groupedArticles).forEach((list) => allArticles.push(...list));

    if (allArticles.length > 0) {
      // Batch fetch all states
      const enrichedAll = await attachArticleStates(allArticles);

      // Re-distribute back to groups (since attachArticleStates returns a new array but order might be preserved?
      // Actually map preserves order. But we flattened it.
      // Better approach: Get States Map first using fetchArticleStatesServer then apply locally to avoid re-grouping complexity?
      // Wait, attachArticleStates IS the helper.
      // Let's use the helper on the flattened list and then rebuild groups? Or cleaner:
      // Just fetch states explicitly here using fetchArticleStatesServer to keep it efficient?
      // The plan said: "await attachArticleStates(groupedArticles)".
      // But groupedArticles is an object { [key]: Article[] }.
      // Let's make attachArticleStates powerful or handle it here.

      // Optimization: Let's keep it simple. Flatten -> Enrich -> Re-Group is safe.
      // Or even better: passing the flat list to attachArticleStates is correct.
      // We just need to map the enriched articles back to their groups.

      // Let's do:
      const enrichedMap = new Map(enrichedAll.map((a) => [a.id, a]));

      for (const key in groupedArticles) {
        groupedArticles[key] = groupedArticles[key].map((a) => enrichedMap.get(a.id) || a);
      }
    }
  }

  return NextResponse.json(groupedArticles);
}
