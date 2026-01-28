import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { Article, Tag, CleanArticleContent, TimeSlot } from '@/shared/types';
import { BRIEFING_SECTIONS } from './constants';
import { STAR_TAG } from '@/domains/interaction/constants';
import { removeEmptyParagraphs, stripLeadingTitle, cleanAIContent } from './utils/content';
import { shanghaiDateSlotToUtcWindow } from './utils/date';

import { logServerBotHit } from '@/domains/security/services/bot-logger';
import { toFullId } from '@/shared/utils/idHelpers';

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
    if (process.env.CI && !process.env.VERCEL)
      return ['2025-01-01', new Date().toISOString().split('T')[0]];
    const supabase = getSupabaseClient();
    const dataPromise = supabase.rpc('get_unique_dates');
    const fetchTimeout = process.env.CI && !process.env.VERCEL ? 3000 : 10000;
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

export const fetchAvailableDatesEn = unstable_cache(
  async (): Promise<string[]> => {
    if (process.env.CI && !process.env.VERCEL)
      return ['2025-01-01', new Date().toISOString().split('T')[0]];
    const supabase = getSupabaseClient();

    // Efficiently get unique dates from articles_view_en view
    // We select n8n_processing_date which is joined from the articles table
    const { data, error } = await supabase
      .from('articles_view_en')
      .select('n8n_processing_date')
      .order('n8n_processing_date', { ascending: false });

    if (error) {
      console.error('Supabase error in fetchAvailableDatesEn:', error);
      return [];
    }

    const uniqueDates = new Set<string>();
    data?.forEach((row: any) => {
      if (row.n8n_processing_date) {
        // Convert UTC timestamp to Shanghai Date string (YYYY-MM-DD)
        const dateStr = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Shanghai',
        }).format(new Date(row.n8n_processing_date));

        uniqueDates.add(dateStr);
      }
    });

    return Array.from(uniqueDates).sort().reverse();
  },
  ['available-dates-en'],
  {
    revalidate: 604800,
    tags: ['available-dates-en'],
  },
);

export async function fetchBriefingData(
  date: string,
  lang: 'zh' | 'en' = 'zh',
  slot?: TimeSlot | null,
  logOptions: { userAgent?: string; headers?: Headers } = {},
): Promise<{ [key: string]: Article[] }> {
  if (process.env.CI && !process.env.VERCEL) {
    if (lang === 'en') return {};
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

  const tableName = lang === 'en' ? 'articles_view_en' : 'articles_view';
  const cacheKeyBase = lang === 'en' ? 'briefing-data-en' : 'briefing-data';
  const tagPrefix = lang === 'en' ? `briefing-data-${date}-en` : `briefing-data-${date}`;

  return unstable_cache(
    async () => {
      const supabase = getSupabaseClient();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Invalid date format in fetchBriefingData:', date);
        return {};
      }

      const { startIso, endIso } = shanghaiDateSlotToUtcWindow(date, slot);

      const dataPromise = supabase
        .from(tableName as any)
        .select('*')
        .gte('n8n_processing_date', startIso)
        .lte('n8n_processing_date', endIso);

      const fetchTimeout = process.env.CI && !process.env.VERCEL ? 3000 : 9000;
      const timeoutPromise = new Promise<{ data: any[] | null; error: unknown }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timed out')), fetchTimeout),
      );

      let rawData: any[] = [];
      let error;
      try {
        const result = (await Promise.race([dataPromise, timeoutPromise])) as any;
        rawData = result.data || [];
        error = result.error;
      } catch (e: any) {
        console.error(`Fetch Briefing Data (${lang}) Timeout or Error:`, e);

        // Logging
        try {
          const userAgent = logOptions.userAgent || `ISR-System-Error-Fallback-${lang}`;
          const path = lang === 'en' ? `/en/date/${date}` : `/date/${date}`;
          const safeHeaders = logOptions.headers || new Headers();

          await logServerBotHit(path, userAgent, safeHeaders, 500, {
            error_message: e.message || String(e),
            error_stack: e.stack,
            stage: 'fetchBriefingData',
            lang,
            date_param: date,
          });
        } catch (logErr) {
          console.error('Failed to log ISR error:', logErr);
        }
        throw e;
      }

      if (error) {
        console.error(`Error fetching from Supabase (${tableName}) by date:`, error);
        throw new Error(`Supabase query failed: ${JSON.stringify(error)}`);
      }

      if (rawData.length === 0) {
        console.warn(
          `[BriefingData-${lang}] Zero articles found for ${date}. Window: ${startIso} - ${endIso}`,
        );
        return {};
      }

      const groupedArticles: { [key: string]: Article[] } = {
        [BRIEFING_SECTIONS.IMPORTANT]: [],
        [BRIEFING_SECTIONS.MUST_KNOW]: [],
        [BRIEFING_SECTIONS.REGULAR]: [],
      };

      rawData.forEach((row: any) => {
        const article: Article = {
          ...row,
          // Handle field name differences and normalization
          sourceName: row.source_name || row.sourceName || '',
          briefingSection:
            row.verdict?.importance || row.briefingSection || BRIEFING_SECTIONS.REGULAR,
          highlights: cleanAIContent(row.highlights),
          critiques: cleanAIContent(row.critiques),
          marketTake: cleanAIContent(row.marketTake),
          tldr: cleanAIContent(row.tldr),
          tags: row.tags || [],
          created_at: row.n8n_processing_date || row.created_at,
          verdict: row.verdict || { importance: BRIEFING_SECTIONS.REGULAR, score: 0 },
        };

        const importance = article.briefingSection;
        if (groupedArticles[importance]) {
          groupedArticles[importance].push(article);
        } else {
          groupedArticles[BRIEFING_SECTIONS.REGULAR].push(article);
        }
      });

      // Sort within groups
      for (const section in groupedArticles) {
        groupedArticles[section].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
      }

      return groupedArticles;
    },
    [cacheKeyBase, date, slot || 'all'],
    {
      revalidate: 604800,
      tags: [cacheKeyBase, tagPrefix, `${tagPrefix}-${slot || 'all'}`],
    },
  )();
}

/**
 * @deprecated Use fetchBriefingData(date, 'en', slot) instead.
 * Legacy wrapper for English briefing data to maintain backward compatibility.
 */
export async function fetchEnglishBriefingData(
  date: string,
  slot?: TimeSlot | null,
): Promise<{ [key: string]: Article[] }> {
  return fetchBriefingData(date, 'en', slot);
}

/**
 * Fetch specific articles by their IDs
 */
export async function fetchArticlesByIds(
  ids: string[],
  tableName: string = 'articles_view',
): Promise<Article[]> {
  if (process.env.CI && !process.env.VERCEL) return [];
  if (!ids || ids.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName as any)
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching articles by IDs:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    sourceName: row.source_name || row.sourceName || '',
    category: row.category || '',
    summary: cleanAIContent(row.summary),
    highlights: cleanAIContent(row.highlights),
    critiques: cleanAIContent(row.critiques),
    marketTake: cleanAIContent(row.marketTake),
    tldr: cleanAIContent(row.tldr),
    // Ensure verdict structure is consistent
    verdict: row.verdict || {
      importance: row.briefingSection || BRIEFING_SECTIONS.REGULAR,
      score: 0,
    },
    // created_at fallback
    created_at: row.n8n_processing_date || row.created_at,
  }));
}

import { sanitizeHtml } from '@/shared/utils/serverSanitize';

export const fetchArticleContent = async (
  id: string | number,
): Promise<CleanArticleContent | null> => {
  if (process.env.CI && !process.env.VERCEL) {
    return {
      title: 'Mock Article',
      content: '<p>Mock content for CI environment.</p>',
      source: 'Mock Source',
    };
  }
  try {
    const freshRss = getFreshRssClient();
    const fullId = toFullId(String(id));
    const apiBody = new URLSearchParams({ i: fullId });
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
      const fullId = toFullId(String(id));
      const { data: dbArticle } = await supabase
        .from('articles_view')
        .select('title')
        .eq('id', fullId)
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
  if ((process.env.CI && !process.env.VERCEL) || !ids || ids.length === 0) return result;

  try {
    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    ids.forEach((id) => formData.append('i', toFullId(String(id))));

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
    const fullId = toFullId(id);
    const apiBody = new URLSearchParams({ i: fullId });
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

// Result type for fetchArticleById with detailed error tracking
export type FetchArticleResult =
  | { success: true; article: Article }
  | {
      success: false;
      article: null;
      errorSource: 'supabase' | 'freshrss' | 'both';
      errorMessage: string;
    };

// Consolidated Options Interface
interface FetchArticleOptions {
  lang?: 'zh' | 'en';
}

export async function fetchArticleById(
  id: string,
  options: FetchArticleOptions = { lang: 'zh' },
): Promise<FetchArticleResult> {
  const lang = options.lang || 'zh';
  const tableName = lang === 'en' ? 'articles_view_en' : 'articles_view';

  if (process.env.CI && !process.env.VERCEL) {
    return {
      success: true,
      article: {
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
      },
    };
  }

  let supabaseError: string | null = null;
  let freshRssError: string | null = null;

  // 1. Try Supabase first
  try {
    const supabase = getSupabaseClient();
    const fullId = toFullId(id);
    const query = supabase.from(tableName as any).select('*');

    // Handle ID matching: articles_view uses string ID, articles_en might use int8/string
    // For safety, we use eq. toFullId ensures correct ID format for app logic.
    // If querying articles_en, we might need to be careful if ID types mismatch in DB schema,
    // but assuming consistency or implicit casting.
    // However, articles_en usually stores numeric IDs?
    // Let's stick to simple ID match for now as per previous fetchEnglishArticleById logic.
    const { data, error } = await query.eq('id', fullId).single();

    if (!error && data) {
      // Mapping: Ensure common fields are populated
      // articles_view has explicit source_name mapping if needed, articles_en usually has snake_case or camelCase?
      // Based on existing code, using generic spread + selective mapping.
      const articleData: Article = {
        ...data,
        highlights: cleanAIContent(data.highlights),
        critiques: cleanAIContent(data.critiques),
        marketTake: cleanAIContent(data.marketTake),
        tldr: cleanAIContent(data.tldr),
        // Fallback for fields that might differ in naming conventions
        sourceName: data.source_name || data.sourceName || '',
        // Ensure Created At is present
        created_at: data.n8n_processing_date || data.created_at,
        // Verdict structure
        verdict: data.verdict || { importance: BRIEFING_SECTIONS.REGULAR, score: 0 },
      };
      return { success: true, article: articleData };
    }
    supabaseError = error?.message || 'not found';
  } catch (e: any) {
    supabaseError = e.message || 'connection failed';
    console.error(`[fetchArticleById] Supabase exception for ${id} (${tableName}):`, e);
  }

  // 2. Fallback to FreshRSS
  console.log(
    `Article ${id} not found in Supabase (${supabaseError}). Attempting FreshRSS fallback...`,
  );
  try {
    const fallbackArticle = await fetchArticleFromFreshRSS(id);
    if (fallbackArticle) {
      return { success: true, article: fallbackArticle };
    }
    freshRssError = 'not found';
  } catch (e: any) {
    freshRssError = e.message || 'connection failed';
    console.error(`[fetchArticleById] FreshRSS exception for ${id}:`, e);
  }

  // 3. Both failed - return detailed error
  if (supabaseError && freshRssError) {
    return {
      success: false,
      article: null,
      errorSource: 'both',
      errorMessage: `Supabase: ${supabaseError}; FreshRSS: ${freshRssError}`,
    };
  } else if (freshRssError) {
    return {
      success: false,
      article: null,
      errorSource: 'freshrss',
      errorMessage: freshRssError,
    };
  } else {
    return {
      success: false,
      article: null,
      errorSource: 'supabase',
      errorMessage: supabaseError || 'unknown',
    };
  }
}

/**
 * @deprecated Use fetchArticleById(id, { lang: 'en' }) instead.
 */
export async function fetchEnglishArticleById(id: string): Promise<FetchArticleResult> {
  return fetchArticleById(id, { lang: 'en' });
}

export const getAvailableFilters = unstable_cache(
  async (): Promise<{ tags: Tag[]; categories: Tag[] }> => {
    if (process.env.CI && !process.env.VERCEL) return { tags: [], categories: [] };
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
  if (process.env.CI && !process.env.VERCEL) return [];
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

export const fetchSubscriptions = unstable_cache(
  async (): Promise<{ id: string; title: string; category?: string }[]> => {
    if (process.env.CI && !process.env.VERCEL) return [];
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
  },
  ['freshrss-subscriptions'],
  { revalidate: 604800, tags: ['available-filters'] },
);

export async function fetchTagsServer(): Promise<{ categories: Tag[]; tags: Tag[] }> {
  try {
    return await getAvailableFilters();
  } catch (error) {
    console.error('Error fetching categories and tags:', error);
    return { categories: [], tags: [] };
  }
}
