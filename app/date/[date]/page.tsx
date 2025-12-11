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

// Helper to extract top keywords from articles
function getTopKeywords(articles: any[], limit = 10): string[] {
    const frequency: Record<string, number> = {};
    articles.forEach(article => {
        if (Array.isArray(article.keywords)) {
            article.keywords.forEach((k: string) => {
                const cleanKey = k.trim();
                if (cleanKey) {
                    frequency[cleanKey] = (frequency[cleanKey] || 0) + 1;
                }
            });
        }
    });
    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([key]) => key);
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
    const { date } = await params;

    // Fetch data for dynamic description
    const groupedArticles = await fetchBriefingData(date);
    const allArticles = Object.values(groupedArticles).flat();

    // Auto-SEO: Extract keywords
    const topKeywords = getTopKeywords(allArticles, 10);
    const topArticles = allArticles.slice(0, 5).map(a => a.title).join(', ');

    // Enhanced description with keywords
    const description = topArticles
        ? `Briefing for ${date}. Focus: ${topKeywords.join(', ')}. Featuring: ${topArticles}...`
        : `Daily AI-curated briefing for ${date}. Highlights: ${topKeywords.join(', ')}.`;

    return {
        title: `${date} Briefing | 每日简报`,
        description: description,
        keywords: topKeywords, // Inject explicit keywords tag
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
        image: {
            '@type': 'ImageObject',
            'url': headerImageUrl || 'https://alok-rss.top/computer_cat_180.jpeg' // Fallback image
        },
        description: description,
        datePublished: `${date}T08:00:00+08:00`, // ISO 8601 with +08:00 timezone (assuming 8 AM Shanghai)
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
                name: article.title,
                description: article.tldr || article.summary || '' // Inject AI Summary/TLDR for Rich Snippets
            }))
        }
    };

    // Calculate Previous and Next dates for Internal Linking (SEO)
    const dates = await fetchAvailableDates();
    const currentIndex = dates.indexOf(date);
    // dates are sorted desc (newest first). 
    // Next date (chronologically tomorrow) is at index - 1. 
    // Prev date (chronologically yesterday) is at index + 1.
    const nextDate = currentIndex > 0 ? dates[currentIndex - 1] : null;
    const prevDate = currentIndex < dates.length - 1 ? dates[currentIndex + 1] : null;

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
                isToday={date === today}
                prevDate={prevDate}
                nextDate={nextDate}
            />
        </>
    );
}
