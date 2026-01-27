import { MetadataRoute } from 'next';
import { getSitemapUrls } from '../lib/sitemap-helper';

// Independent Sitemap for English version
// Outputs: /en/sitemap.xml
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const urls = await getSitemapUrls('en');

    // Convert SitemapURL[] to MetadataRoute.Sitemap
    return urls.map(item => ({
        url: item.url,
        lastModified: item.lastmod,
        changeFrequency: item.changefreq as any,
        priority: parseFloat(item.priority),
    }));
}
