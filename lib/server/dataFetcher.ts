import { getSupabaseClient, getFreshRssClient } from './apiUtils';
import { Article, FreshRSSItem, CleanArticleContent, Tag } from '../../types';
import { toFullId } from '../../utils/idHelpers';
import { BRIEFING_SECTIONS } from '../../lib/constants';
import { unstable_cache } from 'next/cache';
import { removeEmptyParagraphs, stripLeadingTitle, cleanAIContent } from '../../utils/contentUtils';
import { shanghaiDayToUtcWindow } from '../../utils/dateUtils';

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

export async function fetchBriefingData(date: string): Promise<{ [key: string]: Article[] }> {
  return unstable_cache(
    async () => {
      const supabase = getSupabaseClient();

      // Validate date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Invalid date format in fetchBriefingData:', date);
        return {};
      }

      // Use unified Shanghai → UTC window mapping
      const { startIso, endIso } = shanghaiDayToUtcWindow(date);

      // Wrap Supabase query with timeout to prevent serverless function hangs
      const timeoutPromise = new Promise<{ data: Article[] | null; error: unknown }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timed out after 10s')), 10000),
      );

      const dataPromise = supabase
        .from('articles')
        .select('*')
        .gte('n8n_processing_date', startIso)
        .lte('n8n_processing_date', endIso);

      let articles, error;
      try {
        const result = (await Promise.race([dataPromise, timeoutPromise])) as any;
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
        const article: Article = {
          ...rawArticle,
          briefingSection:
            rawArticle.verdict?.importance ||
            rawArticle.briefingSection ||
            BRIEFING_SECTIONS.REGULAR,
          sourceName: rawArticle.source_name || rawArticle.sourceName || '',
          highlights: cleanAIContent(rawArticle.highlights),
          critiques: cleanAIContent(rawArticle.critiques),
          marketTake: cleanAIContent(rawArticle.marketTake),
          tldr: cleanAIContent(rawArticle.tldr),
        };

        const importance = article.briefingSection;
        if (groupedArticles[importance]) {
          groupedArticles[importance].push(article);
        } else {
          groupedArticles[BRIEFING_SECTIONS.REGULAR].push(article);
        }
      });

      for (const importance in groupedArticles) {
        groupedArticles[importance].sort(
          (a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0),
        );
      }

      return groupedArticles;
    },
    ['briefing-data', date], // Key includes date
    {
      revalidate: 604800, // 7 Days
      tags: ['briefing-data', `briefing-data-${date}`], // Dynamic date tag
    },
  )();
}

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

    // 【修改】标题来源优化：优先尝试从 Supabase 获取 AI 优化后的标题
    let title = item.title;
    try {
      const supabase = getSupabaseClient();
      const { data: dbArticle } = await supabase
        .from('articles')
        .select('title')
        .eq('id', id)
        .single();
      if (dbArticle?.title) {
        title = dbArticle.title;
      }
    } catch (_e) {
      console.warn(
        `[fetchArticleContentServer] Could not fetch Supabase title for ${id}, using FreshRSS fallback.`,
      );
    }

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

/**
 * 【批量优化】一次性获取多篇文章的正文
 * 减少对 FreshRSS 的 HTTP 请求次数
 */
export const fetchMultipleArticleContentsServer = async (
  ids: (string | number)[],
  titles?: Map<string, string>,
): Promise<Map<string, CleanArticleContent>> => {
  const result = new Map<string, CleanArticleContent>();
  if (!ids || ids.length === 0) return result;

  try {
    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    ids.forEach((id) => formData.append('i', String(id)));

    // FreshRSS GReader API 支持一次传多个 i 参数
    const data = await freshRss.post<{ items: FreshRSSItem[] }>(
      '/stream/items/contents?output=json',
      formData,
    );

    if (data.items) {
      data.items.forEach((item) => {
        const contentHtml = item.summary?.content || item.content?.content || '';
        const source =
          item.origin?.title ||
          (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');

        // 这里的 title 逻辑简化：优先使用传入的 titles，否则用 FreshRSS 的
        const currentTitle = titles?.get(String(item.id)) || item.title || '';

        const cleanedHtml = stripLeadingTitle(contentHtml, currentTitle);
        const preSanitized = removeEmptyParagraphs(cleanedHtml);
        const finalHtml = sanitizeHtml(preSanitized);

        result.set(String(item.id), {
          title: currentTitle,
          content: finalHtml,
          source: source,
        });
      });
    }
  } catch (error) {
    console.error('[fetchMultipleArticleContentsServer] Error:', error);
  }

  return result;
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

      return {
        categories: categories, // Return raw order from FreshRSS
        tags: tags, // Return raw order
      };
    } catch (e) {
      console.error('SERVER Error fetching filters:', e);
      return { tags: [], categories: [] };
    }
  },
  ['available-filters'], // Cache Key
  { revalidate: 86400 }, // Rewrite every 24 hours (Match global ISR)
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
        // 1. Extract System States (Read/Starred) from categories
        // We strictly filter for /state/ to avoid including Folders or Feed Categories
        const stateTags = (item.categories || []).filter((c) => c.includes('/state/'));

        // 2. Extract User Labels from 'tags' field (Source of Truth)
        // Normalize to 'user/-/label/TagName' format to match system ID conventions
        // Note: We use the raw tag name assuming compatibility with categories format observed
        const userLabelTags = (item.tags || []).map((t) => `user/-/label/${t}`);

        // 3. Annotations (User States override)
        const annotationTags = (item.annotations || []).map((anno) => anno.id).filter(Boolean);

        // Merge: States + UserLabels + Annotations
        const allTags = [...stateTags, ...userLabelTags, ...annotationTags];
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

// 8. 聚合状态辅助函数 (Aggregation Helper)
export async function attachArticleStates(articles: Article[]): Promise<Article[]> {
  if (!articles || articles.length === 0) return [];

  // 1. Fetch Request
  const ids = articles.map((a) => a.id);
  const statesMap = await fetchArticleStatesServer(ids);

  // 2. Merge Strategies
  return articles.map((article) => {
    const freshTags = statesMap[article.id] || [];
    // Combine existing Supabase tags with FreshRSS tags
    // Use Set to deduplicate
    const combinedTags = Array.from(new Set([...(article.tags || []), ...freshTags]));

    return {
      ...article,
      tags: combinedTags,
    };
  });
}
