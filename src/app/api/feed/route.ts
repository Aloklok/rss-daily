import { NextResponse } from 'next/server';
import { fetchAvailableDates, fetchBriefingData } from '@/domains/reading/services';
import { Article } from '@/types';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.alok-rss.top';

export async function GET() {
  try {
    // 1. Get latest date
    const dates = await fetchAvailableDates();
    if (dates.length === 0) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Briefing Hub</title></channel></rss>',
        {
          headers: { 'Content-Type': 'text/xml' },
        },
      );
    }

    // Sort desc just in case, though fetchAvailableDates sorts desc
    const latestDate = dates[0];

    // 2. Fetch articles for that date
    // fetchBriefingData returns grouped articles. Flatten them.
    const grouped = await fetchBriefingData(latestDate);
    const articles = Object.values(grouped).flat();

    // 3. Generate RSS
    const rss = generateRss(articles, latestDate);

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (e) {
    console.error('Error generating feed:', e);
    return new NextResponse('Error generating feed', { status: 500 });
  }
}

function generateRss(articles: Article[], date: string): string {
  const items = articles
    .map((article) => {
      // Generate description logic from previous version
      const description = `
                <p><strong>Verdict:</strong> ${article.verdict?.type || 'N/A'} (Score: ${article.verdict?.score || 0})</p>
                <p><strong>One-Liner:</strong> ${article.summary || ''}</p>
                <p><strong>Market Take:</strong> ${article.marketTake || 'N/A'}</p>
                <p><strong>Critique:</strong> ${article.critiques || 'N/A'}</p>
                <hr/>
                <p><a href="${SITE_URL}/date/${date}">Read full briefing on the Hub</a></p>
            `.trim();

      return `
    <item>
      <title><![CDATA[${article.title || 'Untitled'}]]></title>
      <link>${SITE_URL}/date/${date}#article-${article.id}</link>
      <guid isPermaLink="false">${article.id}</guid>
      <pubDate>${new Date(article.published).toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
      ${article.tags?.map((tag) => `<category>${tag}</category>`).join('') || ''}
      <category>${article.briefingSection || 'General'}</category>
    </item>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>RSS Briefing Hub | Daily AI Insights</title>
    <link>${SITE_URL}</link>
    <description>Your personal daily briefing with AI-curated summaries, critiques, and market takes.</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}
