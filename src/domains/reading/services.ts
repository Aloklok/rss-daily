import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { Article, Tag, CleanArticleContent, TimeSlot } from '@/shared/types';
import { BRIEFING_SECTIONS } from './constants';
import { STAR_TAG } from '@/domains/interaction/constants';
import { removeEmptyParagraphs, stripLeadingTitle, cleanAIContent } from './utils/content';
import { shanghaiDateSlotToUtcWindow } from './utils/date';
import { cache } from 'react';
import { logServerBotHit } from '@/domains/security/services/bot-logger';

// Local interface
interface FreshRssTag {
  id: string;
  type: string;
  count?: number;
}

// TODO: Migrate idHelpers to shared/utils or similar. For now assume relative path or fix it.
// dataFetcher imported `../../utils/idHelpers`.
// I should verify where idHelpers is. `utils/idHelpers.ts`?
// I will assume I need to move it to `src/shared/utils/id-helpers.ts`.

// Migrated from React cache to unstable_cache for edge-level caching
// This allows the data to be cached across requests and revalidated via tags
export const fetchAvailableDates = unstable_cache(
  async (): Promise<string[]> => {
    if (process.env.CI) return ['2025-01-01', new Date().toISOString().split('T')[0]];
    const supabase = getSupabaseClient();
    const dataPromise = supabase.rpc('get_unique_dates');
    const fetchTimeout = process.env.CI ? 3000 : 10000;
    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('fetchAvailableDates timed out')), fetchTimeout),
    );

    try {
      const { data, error } = (await Promise.race([dataPromise, timeoutPromise])) as any;
      if (error) {
        console.error('Supabase error in fetchAvailableDates:', error);
        return [];
      }
      return data?.map((d: { date_str: string }) => d.date_str) || [];
    } catch (e) {
      console.error('fetchAvailableDates catch error:', e);
      return [];
    }
  },
  ['available-dates'],
  {
    revalidate: 604800, // 7 days - aligned with page ISR. Tag invalidation handles updates.
    tags: ['available-dates'], // Allows on-demand revalidation via webhook
  },
);

export async function fetchBriefingData(
  date: string,
  slot?: TimeSlot | null,
  logOptions: { userAgent?: string; headers?: Headers } = {},
): Promise<{ [key: string]: Article[] }> {
  if (process.env.CI) {
    return {
      [BRIEFING_SECTIONS.IMPORTANT]: [
        {
          id: 'mock-1',
          created_at: new Date().toISOString(),
          title: 'CI Mock Article',
          link: 'http://example.com',
          sourceName: 'CI Source',
          published: new Date().toISOString(),
          category: 'Uncategorized',
          briefingSection: BRIEFING_SECTIONS.IMPORTANT,
          keywords: [],
          verdict: { type: 'Neutral', score: 100, importance: BRIEFING_SECTIONS.IMPORTANT },
          summary: 'CI mock summary',
          tldr: 'CI mock TLDR',
          highlights: 'CI mock Highlights',
          critiques: '',
          marketTake: '',
          tags: [],
        },
      ],
    };
  }
  return unstable_cache(
    async () => {
      const supabase = getSupabaseClient();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Invalid date format in fetchBriefingData:', date);
        return {};
      }

      const { startIso, endIso } = shanghaiDateSlotToUtcWindow(date, slot);

      const dataPromise = supabase
        .from('articles_view')
        .select('*')
        .gte('n8n_processing_date', startIso)
        .lte('n8n_processing_date', endIso);

      const fetchTimeout = process.env.CI ? 3000 : 9000;
      const timeoutPromise = new Promise<{ data: Article[] | null; error: unknown }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timed out')), fetchTimeout),
      );

      let articles: Article[] = [];
      let error;
      try {
        const result = (await Promise.race([dataPromise, timeoutPromise])) as any;
        articles = result.data || [];
        error = result.error;
      } catch (e: any) {
        console.error('Fetch Briefing Data Timeout or Error:', e);

        // Reporting: Log the ISR failure so we know why the page is missing
        try {
          // [Refactor] Use passed-in context or safe default to avoid breaking ISR (Static Generation).
          const userAgent = logOptions.userAgent || 'ISR-System-Error-Fallback';
          const path = `/date/${date}`;
          const safeHeaders = logOptions.headers || new Headers();

          await logServerBotHit(path, userAgent, safeHeaders, 500, {
            error_message: e.message || String(e),
            error_stack: e.stack,
            stage: 'fetchBriefingData',
            date_param: date,
            desc: 'System-ISR-Error: Data fetch failed.',
          });
        } catch (logErr) {
          console.error('Failed to log ISR error:', logErr);
        }

        // CRITICAL: Throw error to prevent caching "empty" result
        throw e;
      }

      if (error) {
        console.error('Error fetching from Supabase by date:', error);
        // CRITICAL: Throw error to prevent caching "empty" result
        throw new Error(`Supabase query failed: ${JSON.stringify(error)}`);
      }

      if (articles.length === 0) return {};

      const uniqueById = new Map<string | number, Article>();
      articles.forEach((a) => uniqueById.set(a.id, a));
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
    ['briefing-data', date, slot || 'all'],
    {
      revalidate: 604800,
      tags: ['briefing-data', `briefing-data-${date}`, `briefing-data-${date}-${slot || 'all'}`],
    },
  )();
}

/**
 * Fetch specific articles by their IDs
 */
export async function fetchArticlesByIds(ids: string[]): Promise<Article[]> {
  if (process.env.CI) return [];
  if (!ids || ids.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('articles_view').select('*').in('id', ids);

  if (error) {
    console.error('Error fetching articles by IDs:', error);
    return [];
  }

  return (data || []).map((raw) => ({
    ...raw,
    sourceName: raw.source_name || raw.sourceName || '',
    highlights: cleanAIContent(raw.highlights),
    critiques: cleanAIContent(raw.critiques),
    marketTake: cleanAIContent(raw.marketTake),
    tldr: cleanAIContent(raw.tldr),
  }));
}

import { sanitizeHtml } from '@/shared/utils/serverSanitize';

export const fetchArticleContent = async (
  id: string | number,
): Promise<CleanArticleContent | null> => {
  if (process.env.CI) {
    return {
      title: 'Mock Article',
      content: '<p>Mock content for CI environment.</p>',
      source: 'Mock Source',
    };
  }
  try {
    const freshRss = getFreshRssClient();
    const apiBody = new URLSearchParams({ i: String(id) });
    const data = await freshRss.post<{ items: any[] }>(
      '/stream/items/contents?output=json',
      apiBody,
    );

    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const contentHtml = item.summary?.content || item.content?.content || '';
    const source =
      item.origin?.title ||
      (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');

    let title = item.title;
    try {
      const supabase = getSupabaseClient();
      const { data: dbArticle } = await supabase
        .from('articles_view')
        .select('title')
        .eq('id', id)
        .single();
      if (dbArticle?.title) {
        title = dbArticle.title;
      }
    } catch (_e) {
      console.warn(`[fetchArticleContent] Supabase title fetch failed for ${id}`);
    }

    const cleanedHtml = stripLeadingTitle(contentHtml, title || '');
    const preSanitized = removeEmptyParagraphs(cleanedHtml);
    const finalHtml = sanitizeHtml(preSanitized);

    return {
      title: title,
      content: finalHtml,
      source: source,
    };
  } catch (error) {
    console.error('fetchArticleContent error:', error);
    return null;
  }
};

export const fetchMultipleArticleContents = async (
  ids: (string | number)[],
  titles?: Map<string, string>,
): Promise<Map<string, CleanArticleContent>> => {
  const result = new Map<string, CleanArticleContent>();
  if (process.env.CI || !ids || ids.length === 0) return result;

  try {
    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    ids.forEach((id) => formData.append('i', String(id)));

    const data = await freshRss.post<{ items: any[] }>(
      '/stream/items/contents?output=json',
      formData,
    );

    if (data.items) {
      data.items.forEach((item) => {
        const contentHtml = item.summary?.content || item.content?.content || '';
        const source =
          item.origin?.title ||
          (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');
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
    console.error('[fetchMultipleArticleContents] Error:', error);
  }

  return result;
};

export async function fetchArticleFromFreshRSS(id: string): Promise<Article | null> {
  try {
    const freshRss = getFreshRssClient();
    // Note: ID format handling:
    // - Long ID → Short ID conversion is handled in proxy.ts (301 redirect)
    // - FreshRSS API natively supports short ID queries, no conversion needed here
    const apiBody = new URLSearchParams({ i: id });
    const data = await freshRss.post<{ items: any[] }>(
      '/stream/items/contents?output=json',
      apiBody,
    );

    if (!data.items || data.items.length === 0) return null;
    const item = data.items[0];

    const article: Article = {
      id: item.id,
      created_at: new Date(item.published * 1000).toISOString(),
      title: item.title,
      link: item.alternate?.[0]?.href || '',
      sourceName: item.origin?.title || 'Unknown Source',
      published: new Date(item.published * 1000).toISOString(),
      category: 'Uncategorized',
      briefingSection: BRIEFING_SECTIONS.REGULAR,
      keywords: [],
      verdict: {
        type: 'Neutral',
        score: 0,
        importance: BRIEFING_SECTIONS.REGULAR,
      },
      summary: item.summary?.content || '',
      tldr: '',
      highlights: '',
      critiques: '',
      marketTake: '',
      tags: (item.categories || []) as any[],
    };

    return article;
  } catch (error) {
    console.error('Error fetching fallback article from FreshRSS:', error);
    return null;
  }
}

export async function fetchArticleById(id: string): Promise<Article | null> {
  if (process.env.CI) {
    return {
      id,
      created_at: new Date().toISOString(),
      title: 'Mock Article',
      link: 'http://example.com',
      sourceName: 'Mock Source',
      published: new Date().toISOString(),
      category: 'Uncategorized',
      briefingSection: BRIEFING_SECTIONS.REGULAR,
      keywords: [],
      verdict: { type: 'Neutral', score: 0, importance: BRIEFING_SECTIONS.REGULAR },
      summary: 'Mock summary',
      tldr: 'Mock TLDR',
      highlights: 'Mock Highlights',
      critiques: '',
      marketTake: '',
      tags: [],
    };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('articles_view').select('*').eq('id', id).single();

  if (error || !data) {
    console.log(`Article ${id} not found in Supabase. Attempting FreshRSS fallback...`);
    const fallbackArticle = await fetchArticleFromFreshRSS(id);
    if (fallbackArticle) return fallbackArticle;
    return null;
  }

  return {
    ...data,
    highlights: cleanAIContent(data.highlights),
    critiques: cleanAIContent(data.critiques),
    marketTake: cleanAIContent(data.marketTake),
    tldr: cleanAIContent(data.tldr),
  };
}

export const getAvailableFilters = unstable_cache(
  async (): Promise<{ tags: Tag[]; categories: Tag[] }> => {
    if (process.env.CI) return { tags: [], categories: [] };
    try {
      const freshRss = getFreshRssClient();
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
          const itemCount = (item as any).count ?? (item as any).unread_count;
          if (item.type === 'folder') {
            categories.push({ id: item.id, label, count: itemCount });
          } else {
            tags.push({ id: item.id, label, count: itemCount });
          }
        });
      }
      return { categories, tags };
    } catch (e) {
      console.error('SERVER Error fetching filters:', e);
      return { tags: [], categories: [] };
    }
  },
  ['available-filters'],
  { revalidate: 604800 },
);

export async function fetchStarredArticleHeaders(): Promise<
  { id: string | number; title: string; tags: string[] }[]
> {
  if (process.env.CI) return [];
  try {
    const freshRss = getFreshRssClient();
    const safeStreamId = encodeURIComponent(STAR_TAG);
    const data = await freshRss.get<{ items: any[] }>(`/stream/contents/${safeStreamId}`, {
      n: '50',
      output: 'json',
      excludeContent: 'true',
    });

    if (!data.items) return [];

    return data.items.map((item) => ({
      id: item.id,
      title: item.title || 'Untitled',
      tags: Array.from(new Set([...(item.categories || []), STAR_TAG])),
    }));
  } catch (e) {
    console.error('SERVER Error fetching starred headers:', e);
    return [];
  }
}

export async function fetchSubscriptions(): Promise<
  { id: string; title: string; category?: string }[]
> {
  if (process.env.CI) return [];
  try {
    const freshRss = getFreshRssClient();
    const data = await freshRss.get<{ subscriptions: any[] }>('/subscription/list', {
      output: 'json',
    });
    if (!data.subscriptions) return [];
    return data.subscriptions.map((sub) => ({
      id: sub.id,
      title: sub.title,
      category: sub.categories?.[0]?.label,
    }));
  } catch (e) {
    console.error('SERVER Error fetching subscriptions:', e);
    return [];
  }
}

export async function fetchTagsServer(): Promise<{ categories: Tag[]; tags: Tag[] }> {
  try {
    return await getAvailableFilters();
  } catch (error) {
    console.error('Error fetching categories and tags:', error);
    return { categories: [], tags: [] };
  }
}
