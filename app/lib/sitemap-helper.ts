import { getSupabaseClient } from './api-utils';

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
    const baseUrl = 'https://alok-rss.top';

    const urls = [
        `${baseUrl}/`, // Home
        ...dates.map(date => `${baseUrl}/date/${date}`) // Daily Briefings
    ];

    return urls;
}
