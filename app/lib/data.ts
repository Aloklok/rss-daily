import { getSupabaseClient, getFreshRssClient } from './api-utils';
import { Article, FreshRSSItem, CleanArticleContent, Tag } from '../../types';
import { toFullId } from '../../utils/idHelpers';

export async function fetchAvailableDates(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select('n8n_processing_date')
    .order('n8n_processing_date', { ascending: false });

  if (error) {
    console.error('Supabase error in fetchAvailableDates:', error);
    return [];
  }

  const dateSet = new Set<string>();
  if (data) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Shanghai',
    });

    data.forEach((item) => {
      if (item.n8n_processing_date) {
        const date = new Date(item.n8n_processing_date);
        dateSet.add(formatter.format(date));
      }
    });
  }

  return Array.from(dateSet);
}

export function getTodayInShanghai(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
  return formatter.format(new Date());
}

export async function fetchBriefingData(date: string): Promise<{ [key: string]: Article[] }> {
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
    return {}; // Start with empty if timeout, or throw? better to throw to trigger error.tsx
    // Actually, if we return {}, the page renders "No Articles", which is better than Error page?
    // But user said "Loading..." persisted. If we return {}, it renders BriefingClient -> "No Articles".
    // Let's return {} for now, but log it.
    // Wait, if we return {}, BriefingClient renders. This is SAFE.
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
    重要新闻: [],
    必知要闻: [],
    常规更新: [],
  };

  deduped.forEach((article) => {
    const importance = article.verdict?.importance || '常规更新';
    if (groupedArticles[importance]) {
      groupedArticles[importance].push(article);
    } else {
      // Fallback for unknown importance
      groupedArticles['常规更新'].push(article);
    }
  });

  for (const importance in groupedArticles) {
    groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
  }

  return groupedArticles;
}

// End of imports clean up

// 【新增】服务端直接获取文章内容 (用于 SSR / No-JS)

// Helper to strip title - duplicated from ArticleDetail.tsx but needed here for SSR clean
// Helper to strip title - duplicated from ArticleDetail.tsx but needed here for SSR clean
import { removeEmptyParagraphs, stripLeadingTitle } from '../../utils/contentUtils';

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

    // Apply same cleaning as client-side
    const cleanedHtml = stripLeadingTitle(contentHtml, title || '');
    const finalHtml = removeEmptyParagraphs(cleanedHtml);

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

export async function fetchArticleById(id: string): Promise<Article | null> {
  const supabase = getSupabaseClient();

  // Try to convert to full ID if it looks like a short ID
  // This handles cases where the URL provides a short ID (e.g. from routing)
  const fullId = toFullId(id);

  const { data, error } = await supabase.from('articles').select('*').eq('id', fullId).single();

  if (error) {
    // If searching by full ID fails, try searching by the raw ID just in case
    // (though toFullId handles already-full IDs gracefully)
    if (fullId !== id) {
      const { data: retryData, error: retryError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (!retryError) return retryData;
    }

    console.error('Error fetching article by ID:', error);
    return null;
  }
  return data;
}

// --- New SSR Data Fetchers ---

import { STAR_TAG } from '../../constants';

// Define Interface locally or import if possible. Let's define safely.
interface FreshRssTag {
  id: string;
  type: string;
  count?: number;
}

export async function getAvailableFilters(): Promise<{ tags: Tag[]; categories: Tag[] }> {
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
}

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
