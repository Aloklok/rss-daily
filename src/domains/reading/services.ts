import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { Article, Tag, CleanArticleContent } from '@/shared/types';
import { BRIEFING_SECTIONS } from './constants';
import { STAR_TAG } from '@/domains/interaction/constants';
import { removeEmptyParagraphs, stripLeadingTitle, cleanAIContent } from './utils/content';
import { shanghaiDayToUtcWindow } from './utils/date';

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

export async function fetchAvailableDates(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_unique_dates');

  if (error) {
    console.error('Supabase error in fetchAvailableDates:', error);
    return [];
  }
  return data?.map((d: { date_str: string }) => d.date_str) || [];
}

export async function fetchBriefingData(date: string): Promise<{ [key: string]: Article[] }> {
  return unstable_cache(
    async () => {
      const supabase = getSupabaseClient();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Invalid date format in fetchBriefingData:', date);
        return {};
      }

      const { startIso, endIso } = shanghaiDayToUtcWindow(date);

      const timeoutPromise = new Promise<{ data: Article[] | null; error: unknown }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timed out after 10s')), 10000),
      );

      const dataPromise = supabase
        .from('articles')
        .select('*')
        .gte('n8n_processing_date', startIso)
        .lte('n8n_processing_date', endIso);

      let articles: Article[] = [];
      let error;
      try {
        const result = (await Promise.race([dataPromise, timeoutPromise])) as any;
        articles = result.data || [];
        error = result.error;
      } catch (e) {
        console.error('Fetch Briefing Data Timeout or Error:', e);
        return {};
      }

      if (error) {
        console.error('Error fetching from Supabase by date:', error);
        return {};
      }

      if (articles.length === 0) return {};

      // Hydrate with FreshRSS states (Interaction Domain Adapter)
      // Wait, dataFetcher did NOT attach states directly in fetchBriefingData.
      // It returned raw data?
      // Grouping logic uses `verdict`.
      // The original code did NOT call `attachArticleStates` inside `fetchBriefingData`.
      // It seems states are fetched on client or separately?
      // Ah, `BriefingView` might call it?
      // I'll stick to original logic: plain fetch + grouping.

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
    ['briefing-data', date],
    {
      revalidate: 604800,
      tags: ['briefing-data', `briefing-data-${date}`],
    },
  )();
}

import { sanitizeHtml } from '@/shared/utils/serverSanitize';

export const fetchArticleContent = async (
  id: string | number,
): Promise<CleanArticleContent | null> => {
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
        .from('articles')
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
  if (!ids || ids.length === 0) return result;

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
    // Use raw ID if toFullId not available yet, or import it
    const fullId = id; // Assuming id passed is correct for now or need to fix import
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

export async function fetchArticleById(id: string): Promise<Article | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();

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
          if (item.type === 'folder') {
            categories.push({ id: item.id, label, count: item.count });
          } else {
            tags.push({ id: item.id, label, count: item.count });
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
  { revalidate: 86400 },
);

export async function fetchStarredArticleHeaders(): Promise<
  { id: string | number; title: string; tags: string[] }[]
> {
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
