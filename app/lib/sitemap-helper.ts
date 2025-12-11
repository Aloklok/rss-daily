import { getSupabaseClient, getFreshRssClient } from './api-utils';

export async function getSitemapUrls(): Promise<string[]> {
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
        const formatter = new Intl.DateTimeFormat('en-CA', { // YYYY-MM-DD
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

    // 2. Fetch active Tags from FreshRSS
    let tagUrls: string[] = [];
    try {
        const freshRss = getFreshRssClient();
        const tagData = await freshRss.get<{ tags: { id: string, type: string, count?: number }[] }>('/tag/list', {
            output: 'json',
            with_counts: '1'
        });

        if (tagData.tags) {
            tagUrls = tagData.tags
                .filter((tag: { id: string; type: string; }) => {
                    // Exclude system tags and folders
                    return tag.type !== 'folder' &&
                        !tag.id.includes('/state/com.google/') &&
                        !tag.id.includes('/state/org.freshrss/');
                })
                .sort((a: { count?: number }, b: { count?: number }) => (b.count || 0) - (a.count || 0)) // Sort by count desc
                .slice(0, 50) // Top 50 active tags
                .map((tag: { id: string }) => `${baseUrl}/stream/${encodeURIComponent(tag.id)}`);
        }
    } catch (e) {
        console.error('Failed to fetch tags for sitemap:', e);
    }

    const urls = [
        `${baseUrl}/`, // Home
        ...dates.map(date => `${baseUrl}/date/${date}`), // Daily Briefings
        ...tagUrls // Top 50 Topic Hubs
    ];

    return urls;
}
