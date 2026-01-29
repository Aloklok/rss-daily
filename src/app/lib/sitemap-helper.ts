import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { getSlugLink } from '@/domains/reading/utils/slug-helper';
import { UNCATEGORIZED_LABEL } from '@/domains/reading/constants';

export async function getSitemapUrls(lang: 'zh' | 'en' = 'zh'): Promise<SitemapURL[]> {
  const supabase = getSupabaseClient();
  const baseUrl = 'https://www.alok-rss.top';
  const langPrefix = lang === 'en' ? '/en' : '';
  const baseFullUrl = `${baseUrl}${langPrefix}`;

  // 1. Fetch available dates for the specific language
  let dates: string[] = [];
  if (lang === 'zh') {
    const { data, error } = await supabase.rpc('get_unique_dates');
    if (error) {
      console.error('Supabase error fetching ZH sitemap dates:', error);
    } else {
      dates = data?.map((d: { date_str: string }) => d.date_str) || [];
    }
  } else {
    // English now uses RPC as well to avoid 1000-row limit
    const { data, error } = await supabase.rpc('get_unique_dates_en');

    if (error) {
      console.error('Supabase error fetching EN sitemap dates:', error);
    } else {
      dates = data?.map((d: { date_str: string }) => d.date_str) || [];
    }
  }

  const latestDate = dates.length > 0 ? dates[0] : undefined;

  // 2. Fetch active Tags AND Categories from FreshRSS (Same for both langs)
  let tagUrls: string[] = [];
  let categoryUrls: string[] = [];

  try {
    const freshRss = getFreshRssClient();
    const tagData = await freshRss.get<{ tags: { id: string; type: string; count?: number }[] }>(
      '/tag/list',
      { output: 'json', with_counts: '1' },
    );

    if (tagData.tags) {
      const validItems = tagData.tags.filter((tag) => {
        const decodedId = decodeURIComponent(tag.id);
        return (
          !tag.id.includes('/state/com.google/') &&
          !tag.id.includes('/state/org.freshrss/') &&
          !decodedId.endsWith(UNCATEGORIZED_LABEL) &&
          !decodedId.endsWith('Uncategorized')
        );
      });

      // Categories (Folders)
      categoryUrls = validItems
        .filter((tag) => tag.type === 'folder')
        .map((tag) => `${baseUrl}${getSlugLink(tag.id, lang, 'category')}`);

      // Tags (Labels) - Top 50
      tagUrls = validItems
        .filter((tag) => tag.type !== 'folder')
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 50)
        .map((tag) => `${baseUrl}${getSlugLink(tag.id, lang, 'tag')}`);
    }
  } catch (e) {
    console.error(`Failed to fetch filters for ${lang} sitemap:`, e);
  }

  // 3. Construct URLs with lastmod
  const today = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date());

  const urls: SitemapURL[] = [
    {
      url: `${baseFullUrl}/`,
      lastmod: latestDate,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      url: `${baseFullUrl}/archive`,
      lastmod: latestDate,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      url: `${baseFullUrl}/trends`,
      lastmod: latestDate,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      url: `${baseFullUrl}/sources`,
      lastmod: latestDate,
      changefreq: 'daily',
      priority: '0.7',
    },

    ...dates.map((date: string) => {
      const isToday = date === today;
      return {
        url: `${baseFullUrl}/date/${date}`,
        lastmod: date,
        changefreq: isToday ? 'hourly' : 'weekly',
        priority: isToday ? '0.9' : '0.8',
      };
    }),
    ...categoryUrls.map((url) => ({
      url,
      changefreq: 'daily',
      priority: '0.6',
    })),
    ...tagUrls.map((url) => ({
      url,
      lastmod: latestDate,
      changefreq: 'daily',
      priority: '0.6',
    })),
  ];

  return urls;
}

export interface SitemapURL {
  url: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}
