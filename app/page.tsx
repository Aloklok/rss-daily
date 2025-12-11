import { fetchAvailableDates, fetchBriefingData } from './lib/data';
import MainContentClient from './components/MainContentClient';
import { resolveBriefingImage } from '../services/articleLoader';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

async function getLatestBriefingData() {
    const dates = await fetchAvailableDates();
    const initialDate = dates.length > 0 ? dates[0] : undefined;

    if (!initialDate) return { initialDate: undefined, articles: [], headerImageUrl: undefined, dates: [] };

    const groupedArticles = await fetchBriefingData(initialDate);
    const articles = Object.values(groupedArticles).flat();
    const headerImageUrl = await resolveBriefingImage(initialDate);

    // Return dates as well so we can build the archive schema
    return { initialDate, articles, headerImageUrl, dates };
}

export async function generateMetadata(): Promise<Metadata> {
    const { initialDate, articles } = await getLatestBriefingData();

    if (!initialDate || articles.length === 0) {
        return {
            title: 'RSS Briefing Hub - Daily AI Updates | 每日简报归档',
            description: 'Index of daily AI-curated technology briefings. | 每日 AI 科技简报索引。',
        };
    }

    const tldrList = articles
        .slice(0, 10)
        .map((a, i) => `${i + 1}. ${a.tldr || a.title}`)
        .join(' ');

    const description = tldrList
        ? `${initialDate} 每日简报。本期要点：${tldrList}`
        : `${initialDate} 每日 AI 精选简报。汇聚科技新闻与 RSS 订阅精华。`;

    return {
        title: `${initialDate} Briefing | 每日简报`,
        description: description,
        alternates: {
            canonical: 'https://www.alok-rss.top',
        },
        openGraph: {
            title: `${initialDate} Briefing | 每日简报`,
            description: description,
            type: 'website',
            url: 'https://www.alok-rss.top',
            siteName: 'Briefing Hub',
        },
    };
}

export default async function Home() {
    const { initialDate, articles, headerImageUrl, dates } = await getLatestBriefingData();

    // Use a multi-schema approach: NewsArticle (Content) + CollectionPage (Navigation)
    const renderSchemas = [];

    // 1. NewsArticle Schema (Latest Briefing)
    if (initialDate && articles.length > 0) {
        const tldrList = articles
            .slice(0, 10)
            .map((a, i) => `${i + 1}. ${a.tldr || a.title}`)
            .join(' ');

        const description = tldrList
            ? `${initialDate} 每日简报。本期要点：${tldrList}`
            : `${initialDate} 每日 AI 精选简报。汇聚科技新闻与 RSS 订阅精华。`;

        renderSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: `${initialDate} Briefing | 每日简报`,
            image: {
                '@type': 'ImageObject',
                'url': headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg'
            },
            description: description,
            datePublished: `${initialDate}T08:00:00+08:00`,
            author: [{
                '@type': 'Organization',
                name: 'Briefing Hub',
                url: 'https://www.alok-rss.top'
            }],
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: articles.map((article, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `https://www.alok-rss.top/article/${article.id}`,
                    name: article.title,
                    description: article.summary || article.tldr || ''
                }))
            }
        });
    }

    // 2. CollectionPage Schema (Archive/Navigation)
    // Always include valid recent dates to ensure crawlers find history
    const recentDates = dates ? dates.slice(0, 10) : [];
    if (recentDates.length > 0) {
        renderSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            headline: 'Briefing Archive | 往期简报',
            description: 'Index of daily AI-curated technology briefings. | 每日 AI 科技简报索引。',
            url: 'https://www.alok-rss.top',
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: recentDates.map((date, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `https://www.alok-rss.top/date/${date}`,
                    name: `${date} Briefing | 每日简报`
                }))
            }
        });
    }

    // Fallback if truly nothing exists (unlikely)
    if (renderSchemas.length === 0) {
        renderSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Briefing Hub',
            url: 'https://www.alok-rss.top',
            description: 'Daily AI-curated technology briefings.'
        });
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(renderSchemas) }}
            />
            <MainContentClient
                initialDate={initialDate}
                initialHeaderImageUrl={headerImageUrl}
                initialArticles={articles}
            />
        </>
    );
}
