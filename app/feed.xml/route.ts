import { NextResponse } from 'next/server';
import { getAvailableDates } from '@/services/api';
import { fetchBriefingArticles } from '@/services/articleLoader';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    try {
        // 1. 获取最新的简报日期
        const dates = await getAvailableDates();
        const latestDate = dates[0];

        if (!latestDate) {
            return new NextResponse('No content available', { status: 404 });
        }

        // 2. 获取该日期的所有文章（包含 AI 分析数据）
        const articles = await fetchBriefingArticles(latestDate, null);

        // 3. 生成 RSS XML
        const feedParams = {
            title: "RSS Briefing Hub | Daily AI Insights",
            description: "Your personal daily briefing with AI-curated summaries, critiques, and market takes.",
            link: "https://www.alok-rss.top",
            lastBuildDate: new Date().toUTCString(),
        };

        const itemXmls = articles.map(article => {
            // 构建 item 内容：只包含 AI 生成的部分，不包含原文
            const description = `
                <p><strong>Verdict:</strong> ${article.verdict?.type} (Score: ${article.verdict?.score})</p>
                <p><strong>One-Liner:</strong> ${article.summary}</p>
                <p><strong>Market Take:</strong> ${article.marketTake || 'N/A'}</p>
                <p><strong>Critique:</strong> ${article.critiques || 'N/A'}</p>
                <hr/>
                <p><a href="https://www.alok-rss.top/date/${latestDate}">Read full briefing on the Hub</a></p>
            `.trim();

            return `
            <item>
                <title><![CDATA[${article.title}]]></title>
                <link>https://www.alok-rss.top/date/${latestDate}#article-${article.id}</link>
                <guid isPermaLink="false">${article.id}</guid>
                <pubDate>${new Date(article.published).toUTCString()}</pubDate>
                <description><![CDATA[${description}]]></description>
                <category>${article.briefingSection}</category>
            </item>
            `;
        }).join('\n');

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${feedParams.title}</title>
        <link>${feedParams.link}</link>
        <description>${feedParams.description}</description>
        <language>zh-cn</language>
        <lastBuildDate>${feedParams.lastBuildDate}</lastBuildDate>
        <atom:link href="https://www.alok-rss.top/feed.xml" rel="self" type="application/rss+xml" />
        ${itemXmls}
    </channel>
</rss>`;

        return new NextResponse(rssXml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate',
            },
        });

    } catch (error: unknown) {
        console.error('Error generating feed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
