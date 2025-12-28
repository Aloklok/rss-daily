import { getSupabaseClient, getFreshRssClient } from './apiUtils';
import { Article, FreshRSSItem, CleanArticleContent, Tag } from '../../types';
import { toFullId } from '../../utils/idHelpers';
import { BRIEFING_SECTIONS } from '../../lib/constants';
import { unstable_cache } from 'next/cache';
import { removeEmptyParagraphs, stripLeadingTitle, cleanAIContent } from '../../utils/contentUtils';

export async function fetchAvailableDates(): Promise<string[]> {
  const supabase = getSupabaseClient();

  // Use Optimized RPC call (O(1) instead of O(N))
  // The RPC handles timezones and deduplication on the DB side
  const { data, error } = await supabase.rpc('get_unique_dates');

  if (error) {
    console.error('Supabase error in fetchAvailableDates:', error);
    return [];
  }

  // The RPC returns { date_str: string }[]
  return data?.map((d: { date_str: string }) => d.date_str) || [];
}

import { getTodayInShanghai } from '../../utils/dateUtils';
export { getTodayInShanghai };

export const fetchBriefingData = unstable_cache(
  async (date: string): Promise<{ [key: string]: Article[] }> => {
    const supabase = getSupabaseClient();

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error('Invalid date format in fetchBriefingData:', date);
      return {};
    }

    const [year, month, day] = date.split('-').map(Number);

    // Shanghai is UTC+8.
    // We construct the UTC time corresponding to Shanghai's 00:00:00 and 23:59:59.999
    // 00:00:00 Shanghai = 16:00:00 UTC (previous day) -> handled by -8 hours
    const startDate = new Date(Date.UTC(year, month - 1, day, 0 - 8, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23 - 8, 59, 59, 999));

    // Wrap Supabase query with timeout to prevent serverless function hangs
    const timeoutPromise = new Promise<{ data: Article[] | null; error: unknown }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase query timed out after 10s')), 10000),
    );

    const dataPromise = supabase
      .from('articles')
      .select('*')
      .gte('n8n_processing_date', startDate.toISOString())
      .lte('n8n_processing_date', endDate.toISOString());

    let articles, error;
    try {
      const result = await Promise.race([dataPromise, timeoutPromise]);
      // Supabase returns { data, error } structure
      articles = result.data;
      error = result.error;
    } catch (e: unknown) {
      console.error('Fetch Briefing Data Timeout or Error:', e);
      return {};
    }

    if (error) {
      console.error('Error fetching from Supabase by date:', error);
      return {};
    }

    if (!articles || articles.length === 0) {
      return {};
    }

    const uniqueById = new Map<string | number, Article>();
    articles.forEach((a: Article) => {
      uniqueById.set(a.id, a);
    });
    const deduped = Array.from(uniqueById.values());

    const groupedArticles: { [key: string]: Article[] } = {
      [BRIEFING_SECTIONS.IMPORTANT]: [],
      [BRIEFING_SECTIONS.MUST_KNOW]: [],
      [BRIEFING_SECTIONS.REGULAR]: [],
    };

    deduped.forEach((rawArticle: any) => {
      // Map Supabase JSON fields to Article properties
      // Critical: Map verdict.importance to briefingSection because DB lacks this column
      const article: Article = {
        ...rawArticle,
        briefingSection:
          rawArticle.verdict?.importance || rawArticle.briefingSection || BRIEFING_SECTIONS.REGULAR,
        sourceName: rawArticle.source_name || rawArticle.sourceName || '',
        // Clean AI Fields
        highlights: cleanAIContent(rawArticle.highlights),
        critiques: cleanAIContent(rawArticle.critiques),
        marketTake: cleanAIContent(rawArticle.marketTake),
        tldr: cleanAIContent(rawArticle.tldr),
      };

      const importance = article.briefingSection;
      if (groupedArticles[importance]) {
        groupedArticles[importance].push(article);
      } else {
        // Fallback for unknown importance
        groupedArticles[BRIEFING_SECTIONS.REGULAR].push(article);
      }
    });

    for (const importance in groupedArticles) {
      groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
    }

    return groupedArticles;
  },
  ['briefing-data'], // Cache Key
  { revalidate: 3600 }, // Revalidate every hour
);

// End of imports clean up

// 【新增】服务端直接获取文章内容 (用于 SSR / No-JS)

// Helper to strip title - duplicated from ArticleDetail.tsx but needed here for SSR clean
// Helper to strip title - duplicated from ArticleDetail.tsx but needed here for SSR clean
// Helper to strip title - duplicated from ArticleDetail.tsx but needed here for SSR clean
import { sanitizeHtml } from '../../utils/serverSanitize';

export const fetchArticleContentServer = async (
  id: string | number,
): Promise<CleanArticleContent | null> => {
  try {
    const freshRss = getFreshRssClient();
    const apiBody = new URLSearchParams({ i: String(id) });
    // Use endpoint to get JSON content
    const data = await freshRss.post<{ items: FreshRSSItem[] }>(
      '/stream/items/contents?output=json',
      apiBody,
    );

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const contentHtml = item.summary?.content || item.content?.content || '';
    const source =
      item.origin?.title ||
      (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');
    const title = item.title;

    // Apply strict sanitization order:
    // 1. Strip redundant title (text operation)
    // 2. Remove empty paragraphs (HTML regex operation)
    // 3. Sanitize HTML (security + tag whitelist) - moved from client to server
    const cleanedHtml = stripLeadingTitle(contentHtml, title || '');
    const preSanitized = removeEmptyParagraphs(cleanedHtml);
    const finalHtml = sanitizeHtml(preSanitized);

    return {
      title: title,
      content: finalHtml,
      source: source,
    };
  } catch (error) {
    console.error('fetchArticleContentServer error:', error);
    return null;
  }
};

// Helper to fetch directly from FreshRSS as fallback
export async function fetchArticleFromFreshRSS(id: string): Promise<Article | null> {
  try {
    const freshRss = getFreshRssClient();
    const fullId = toFullId(id);
    const apiBody = new URLSearchParams({ i: fullId });

    // Use /stream/items/contents to get the single item
    const data = await freshRss.post<{ items: FreshRSSItem[] }>(
      '/stream/items/contents?output=json',
      apiBody,
    );

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];

    // Map FreshRSS Item to Article
    // We have to fill in missing AI-generated fields with placeholders
    const article: Article = {
      id: item.id,
      created_at: new Date(item.published * 1000).toISOString(),
      title: item.title,
      link: item.alternate?.[0]?.href || '',
      sourceName: item.origin?.title || 'Unknown Source',
      published: new Date(item.published * 1000).toISOString(),
      // Use current time as processing date since it's a fallback
      n8n_processing_date: new Date().toISOString(),
      category: 'Uncategorized', // Default
      briefingSection: BRIEFING_SECTIONS.REGULAR,
      keywords: [],
      verdict: {
        type: 'Neutral',
        score: 0,
        importance: BRIEFING_SECTIONS.REGULAR,
      },
      summary: item.summary?.content || '', // Use native summary if available
      tldr: '', // Leave empty to indicate no AI summary
      highlights: '',
      critiques: '',
      marketTake: '',
      tags: (item.categories || []) as any[], // Clean string array
    };

    return article;
  } catch (error) {
    console.error('Error fetching fallback article from FreshRSS:', error);
    return null;
  }
}

export async function fetchArticleById(id: string): Promise<Article | null> {
  const supabase = getSupabaseClient();

  // Try to convert to full ID if it looks like a short ID
  // This handles cases where the URL provides a short ID (e.g. from routing)
  const fullId = toFullId(id);

  const { data, error } = await supabase.from('articles').select('*').eq('id', fullId).single();

  if (error || !data) {
    console.log(`Article ${id} not found in Supabase. Attempting FreshRSS fallback...`);

    // Fallback: Try fetching directly from FreshRSS
    const fallbackArticle = await fetchArticleFromFreshRSS(id);

    if (fallbackArticle) {
      return fallbackArticle;
    }

    // If searching by full ID fails, try searching by the raw ID just in case
    // (Supabase retry logic - usually unlikely to help if fullId failed, but keeping original logic flow)
    if (fullId !== id) {
      const { data: retryData, error: retryError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (!retryError) return retryData;
    }

    if (error) {
      console.error('Error fetching article by ID (Supabase):', error);
    }
    return null;
  }

  // Sanitize fields before returning
  return {
    ...data,
    highlights: cleanAIContent(data.highlights),
    critiques: cleanAIContent(data.critiques),
    marketTake: cleanAIContent(data.marketTake),
    tldr: cleanAIContent(data.tldr),
  };
}

// --- New SSR Data Fetchers ---

import { STAR_TAG } from '../../constants';

// Define Interface locally or import if possible. Let's define safely.
interface FreshRssTag {
  id: string;
  type: string;
  count?: number;
}

export const getAvailableFilters = unstable_cache(
  async (): Promise<{ tags: Tag[]; categories: Tag[] }> => {
    try {
      const freshRss = getFreshRssClient();

      // Use the proven endpoint from app/api/list-categories-tags/route.ts
      const data = await freshRss.get<{ tags: FreshRssTag[] }>('/tag/list', {
        output: 'json',
        with_counts: '1',
      });

      const categories: Tag[] = [];
      const tags: Tag[] = [];

      if (data.tags) {
        data.tags.forEach((item) => {
          const label = decodeURIComponent(item.id.split('/').pop() || '');

          if (item.id.includes('/state/com.google/') || item.id.includes('/state/org.freshrss/')) {
            return;
          }

          if (item.type === 'folder') {
            categories.push({ id: item.id, label, count: item.count });
          } else {
            tags.push({ id: item.id, label, count: item.count });
          }
        });
      }

      const sortByName = (a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label, 'zh-Hans-CN');

      return {
        categories: categories.sort(sortByName),
        tags: tags.sort(sortByName),
      };
    } catch (e) {
      console.error('SERVER Error fetching filters:', e);
      return { tags: [], categories: [] };
    }
  },
  ['available-filters'], // Cache Key
  { revalidate: 3600 }, // Rewrite every 1 hour
);

export async function fetchStarredArticleHeaders(): Promise<
  { id: string | number; title: string; tags: string[] }[]
> {
  try {
    const freshRss = getFreshRssClient();
    const params = {
      n: '50',
      output: 'json',
      excludeContent: 'true',
    };

    // Use the correct endpoint: /stream/contents/{streamId}
    const safeStreamId = encodeURIComponent(STAR_TAG);
    const data = await freshRss.get<{ items: FreshRSSItem[] }>(
      `/stream/contents/${safeStreamId}`,
      params,
    );

    if (!data.items) return [];

    return data.items.map((item) => ({
      id: item.id,
      title: item.title || 'Untitled',
      // Ensure STAR_TAG is present since we fetched from the starred stream
      tags: Array.from(new Set([...(item.categories || []), STAR_TAG])),
    }));
  } catch (e) {
    console.error('SERVER Error fetching starred headers:', e);
    return [];
  }
}

// 6. 获取订阅列表 (用于 Source Filter)
// [Security] filter out sensitive URLs
export async function fetchSubscriptions(): Promise<
  { id: string; title: string; category?: string }[]
> {
  try {
    const freshRss = getFreshRssClient();
    const data = await freshRss.get<{
      subscriptions: {
        id: string;
        title: string;
        url?: string;
        htmlUrl?: string;
        iconUrl?: string;
        categories?: { id: string; label: string }[];
      }[];
    }>('/subscription/list', { output: 'json' });

    if (!data.subscriptions) return [];

    return data.subscriptions.map((sub) => ({
      id: sub.id,
      title: sub.title,
      // FreshRSS typically returns one folder category per subscription.
      // We pick the first one as the primary category for grouping.
      category: sub.categories?.[0]?.label,
    }));
  } catch (e) {
    console.error('SERVER Error fetching subscriptions:', e);
    return [];
  }
}

// 7. 获取文章状态 (Server-Side)
export async function fetchArticleStatesServer(
  articleIds: (string | number)[],
): Promise<{ [key: string]: string[] }> {
  if (!articleIds || articleIds.length === 0) return {};

  try {
    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    articleIds.forEach((id: string | number) => formData.append('i', String(id)));

    // Fetch from FreshRSS
    // Use the same endpoint logic as the API route
    const data = await freshRss.post<{ items: FreshRSSItem[] }>(
      '/stream/items/contents?output=json&excludeContent=1',
      formData,
    );

    const states: { [key: string]: string[] } = {};
    if (data.items) {
      data.items.forEach((item: FreshRSSItem) => {
        // Merge categories (folders/labels) and annotations (user states like starred/read)
        const annotationTags = (item.annotations || []).map((anno) => anno.id).filter(Boolean);
        const allTags = [...(item.categories || []), ...annotationTags];
        states[item.id] = [...new Set(allTags)];
      });
    }

    return states;
  } catch (error) {
    console.error('SERVER Error fetching article states:', error);
    // Return empty map on error to allow graceful degradation
    return {};
  }
}
