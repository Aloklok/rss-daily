import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { Article, FreshRSSItem } from '@/shared/types';
import { mapFreshItemToMinimalArticle } from '@/domains/reading/adapters/fresh-rss-mapper';

// Function mapFreshItemToMinimalArticle moved to '@/lib/server/mappers'

// Fetch details from Supabase (Bypassing /api/get-briefings)
async function fetchSupabaseDetails(
  articleIds: (string | number)[],
): Promise<Record<string, Article>> {
  if (articleIds.length === 0) return {};
  const supabase = getSupabaseClient();

  // We only need specific fields that might be missing from FreshRSS
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .in('id', articleIds.map(String));

  if (error || !data) {
    console.warn('SSR: Failed to fetch Supabase details', error);
    return {};
  }

  const map: Record<string, Article> = {};
  data.forEach((item: any) => {
    // Map Supabase columns to Article type (Partial)
    // Note: The Article type in codebase matches Supabase columns mostly
    map[item.id] = item as Article;
  });
  return map;
}

// Main SSR Function
export async function fetchFilteredArticlesSSR(
  filterValue: string,
  n: number = 20,
  merge: boolean = true,
): Promise<{ articles: Article[]; continuation?: string }> {
  console.log(`[SSR] Fetching articles for: ${filterValue} (Merge: ${merge})`);

  // 1. Fetch from FreshRSS directly
  const freshRss = getFreshRssClient();
  const safeStreamId = filterValue.replace(/&/g, '%26');
  const params: Record<string, string> = {
    output: 'json',
    excludeContent: '1',
    n: String(n),
  };

  let freshArticles: Article[] = [];
  let continuation: string | undefined;

  try {
    const data = await freshRss.get<{ items: FreshRSSItem[]; continuation?: string }>(
      `/stream/contents/${safeStreamId}`,
      params,
    );
    freshArticles = (data.items || []).map(mapFreshItemToMinimalArticle);
    continuation = data.continuation;
  } catch (e) {
    console.error('[SSR] FreshRSS fetch failed:', e);
    return { articles: [] };
  }

  // 2. MergeSupabase details if requested
  if (merge && freshArticles.length > 0) {
    const articleIds = freshArticles.map((a) => a.id);
    const supaDetailsMap = await fetchSupabaseDetails(articleIds);

    freshArticles = freshArticles.map((freshArticle) => {
      const supaDetails = supaDetailsMap[freshArticle.id];
      // Supabase details (AI summary, etc.) must overwrite FreshRSS placeholders
      return supaDetails ? { ...freshArticle, ...supaDetails } : freshArticle;
    });
  }

  return { articles: freshArticles, continuation };
}
