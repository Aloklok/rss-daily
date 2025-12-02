import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from './_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = getSupabaseClient();

    // 1. Fetch all available dates with content
    const { data, error } = await supabase
        .from('articles')
        .select('n8n_processing_date')
        .order('n8n_processing_date', { ascending: false });

    if (error) {
        console.error('Supabase error in sitemap:', error);
        return res.status(500).send('Error generating sitemap');
    }

    // 2. Process dates (deduplicate and format)
    const dateSet = new Set<string>();
    if (data) {
        const formatter = new Intl.DateTimeFormat('en-CA', { // YYYY-MM-DD
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Shanghai',
        });

        data.forEach(item => {
            if (item.n8n_processing_date) {
                const date = new Date(item.n8n_processing_date);
                dateSet.add(formatter.format(date));
            }
        });
    }

    const dates = Array.from(dateSet);
    const baseUrl = 'https://alok-rss.top'; // Hardcoded base URL as per existing sitemap

    // 3. Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${dates.map(date => `
  <url>
    <loc>${baseUrl}/date/${date}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

    // 4. Send response
    res.setHeader('Content-Type', 'application/xml');
    // Cache for 1 hour (s-maxage=3600), stale-while-revalidate for 1 day
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(sitemap);
}
