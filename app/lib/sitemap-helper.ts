import { getSupabaseClient, getFreshRssClient } from '../../lib/server/apiUtils';

export async function getSitemapUrls(): Promise<SitemapURL[]> {
  const supabase = getSupabaseClient();

  // 1. Fetch all available dates
  const { data, error } = await supabase
    .from('articles')
    .select('n8n_processing_date')
    .order('n8n_processing_date', { ascending: false });

  if (error) {
    console.error('Supabase error fetching sitemap data:', error);
    return [];
  }

  const dateSet = new Set<string>();

  if (data) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      // YYYY-MM-DD
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Shanghai',
    });

    data.forEach((item: { n8n_processing_date: string | null }) => {
      if (item.n8n_processing_date) {
        const date = new Date(item.n8n_processing_date);
        dateSet.add(formatter.format(date));
      }
    });
  }

  const dates = Array.from(dateSet);
  const baseUrl = 'https://www.alok-rss.top';

  // 2. Fetch active Tags AND Categories from FreshRSS
  let tagUrls: string[] = [];
  let categoryUrls: string[] = [];

  try {
    const freshRss = getFreshRssClient();
    const tagData = await freshRss.get<{ tags: { id: string; type: string; count?: number }[] }>(
      '/tag/list',
      {
        output: 'json',
        with_counts: '1',
      },
    );

    if (tagData.tags) {
      const validItems = tagData.tags.filter(
        (tag) => !tag.id.includes('/state/com.google/') && !tag.id.includes('/state/org.freshrss/'),
      );

      // Categories (Folders)
      categoryUrls = validItems
        .filter((tag) => tag.type === 'folder')
        .map((tag) => `${baseUrl}/stream/${encodeURIComponent(tag.id)}`);

      // Tags (Labels) - Top 50
      tagUrls = validItems
        .filter((tag) => tag.type !== 'folder')
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 50)
        .map((tag) => `${baseUrl}/stream/${encodeURIComponent(tag.id)}`);
    }
  } catch (e) {
    console.error('Failed to fetch filters for sitemap:', e);
  }

  // 3. Construct URLs with lastmod
  const urls = [
    {
      url: `${baseUrl}/`,
      lastmod: dates.length > 0 ? dates[0] : undefined, // Homepage updates with latest briefing
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      url: `${baseUrl}/archive`,
      lastmod: dates.length > 0 ? dates[0] : undefined, // Archive updates with any new content
      changefreq: 'daily',
      priority: '0.7',
    },
    ...dates.map((date) => {
      // Check if it's today (simple string comparison works because dates array is YYYY-MM-DD strings)
      // We need to get "Today" in Shanghai timezone to match the data format.
      const today = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai',
      }).format(new Date());

      const isToday = date === today;

      return {
        url: `${baseUrl}/date/${date}`,
        // Critical SEO Fix:
        // If the date is TODAY, we use the current ISO timestamp as lastmod.
        // This tells crawlers "This page has changed right now!" (since the cache is 1h).
        // If the date is PAST, we just use the date string (YYYY-MM-DD) which serves as a stable anchor.
        lastmod: isToday ? new Date().toISOString() : date,
        changefreq: isToday ? 'hourly' : 'weekly', // Hourly for today to encourage re-crawling
        priority: isToday ? '0.9' : '0.8',
      };
    }),
    ...categoryUrls.map((url) => ({
      url: url,
      // Categories update daily, no lastmod calculation needed
      changefreq: 'daily',
      priority: '0.6',
    })),
    ...tagUrls.map((url) => ({
      url: url,
      lastmod: dates.length > 0 ? dates[0] : undefined, // Tags update with new content, use latest daily date
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
