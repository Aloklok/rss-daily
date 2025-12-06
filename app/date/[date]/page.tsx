import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBriefingData, fetchAvailableDates, getTodayInShanghai } from '../../lib/data';
import ArticleCard from '../../components/ArticleCard';
import BriefingClient from './BriefingClient';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveBriefingImage } from '../../../services/articleLoader';

// Revalidate every hour for past dates (ISR).
// For "Today", we will use noStore() to opt out of caching.
export const revalidate = 604800;

export async function generateStaticParams() {
    const dates = await fetchAvailableDates();
    const today = getTodayInShanghai();

    // Exclude today from static generation to ensure it's always treated as dynamic (SSR) initially
    // and to avoid building a stale version at build time.
    return dates
        .filter(date => date !== today)
        .map((date) => ({
            date: date,
        }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
    const { date } = await params;

    // Fetch data for dynamic description
    const groupedArticles = await fetchBriefingData(date);
    const allArticles = Object.values(groupedArticles).flat();
    const topArticles = allArticles.slice(0, 5).map(a => a.title).join(', ');
    const description = topArticles
        ? `Briefing for ${date}. Featuring: ${topArticles}... | ${date} 每日简报。精选内容：${topArticles}...`
        : `Daily AI-curated briefing for ${date}. Highlights and summaries from tech news and RSS feeds. | ${date} 每日 AI 精选简报。汇聚科技新闻与 RSS 订阅精华。`;

    return {
        title: `${date} Briefing | 每日简报`,
        description: description,
        alternates: {
            canonical: `/date/${date}`,
        },
        openGraph: {
            title: `${date} Briefing | 每日简报`,
            description: description,
            type: 'article',
            publishedTime: date,
        },
    };
}

export default async function BriefingPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
    const today = getTodayInShanghai();

    // If it's today, opt out of caching to ensure real-time updates (SSR)
    if (date === today) {
        noStore();
    }

    const groupedArticles = await fetchBriefingData(date);

    // Flatten articles for BriefingClient
    const allArticles = Object.values(groupedArticles).flat();

    // Check if empty
    const hasArticles = allArticles.length > 0;

    // Prefetch header image
    const headerImageUrl = await resolveBriefingImage(date);

    const topArticles = allArticles.slice(0, 5).map(a => a.title).join(', ');
    const description = topArticles
        ? `Briefing for ${date}. Featuring: ${topArticles}... | ${date} 每日简报。精选内容：${topArticles}...`
        : `Daily AI-curated briefing for ${date}. Highlights and summaries from tech news and RSS feeds. | ${date} 每日 AI 精选简报。汇聚科技新闻与 RSS 订阅精华。`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: `${date} Briefing | 每日简报`,
        description: description,
        datePublished: date,
        author: [{
            '@type': 'Organization',
            name: 'Briefing Hub',
            url: 'https://alok-rss.top'
        }],
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: allArticles.map((article, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://alok-rss.top/article/${article.id}`,
                name: article.title
            }))
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BriefingClient
                articles={allArticles}
                date={date}
                headerImageUrl={headerImageUrl}
            />
        </>
    );
}
