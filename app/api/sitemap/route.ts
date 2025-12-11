import { NextResponse } from 'next/server';
import { getSitemapUrls } from '../../lib/sitemap-helper';

export const dynamic = 'force-dynamic';

export async function GET() {
    const urls = await getSitemapUrls();
    const baseUrl = 'https://www.alok-rss.top'; // Keep for safety or redundancy if needed, though urls has full path

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${item.url}</loc>
    ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ''}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new NextResponse(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 's-maxage=86400, stale-while-revalidate=86400',
        },
    });
}
