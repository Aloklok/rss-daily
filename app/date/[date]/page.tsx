import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBriefingData, fetchAvailableDates, getTodayInShanghai } from '../../lib/data';

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

    // Fetch header image for metadata
    const headerImageUrl = await resolveBriefingImage(date);

    // Construct description from Article TLDRs (User Preference: Numbered list of TLDRs)
    // Example: 1. AI辅助... 2. Memori...
    const tldrList = allArticles
        .slice(0, 10) // Limit to top 10 to avoid excessive length
        .map((a, i) => `${i + 1}. ${a.tldr || a.title}`)
        .join(' ');

    const description = tldrList
        ? `${date} 每日简报。本期要点：${tldrList}`
        : `${date} 每日精选简报。汇聚科技新闻与 RSS 订阅精华。`;

    // Dynamic Title Generation: "Title Party" Mode
    const PRIORITY_MAP: Record<string, number> = {
        '重要新闻': 3,
        '必知要闻': 2,
        '常规更新': 1,
    };

    // Sort ALL articles by Priority descending, then by specific Score descending
    const sortedForTitle = [...allArticles].sort((a, b) => {
        const pA = PRIORITY_MAP[a.briefingSection || '常规更新'] || 0;
        const pB = PRIORITY_MAP[b.briefingSection || '常规更新'] || 0;
        if (pA !== pB) return pB - pA; // Higher priority first
        return (b.verdict?.score || 0) - (a.verdict?.score || 0); // Higher score first within priority
    });

    const topArticles = sortedForTitle.slice(0, 2); // Get top 2
    let dynamicTitle = `${date} `;

    if (topArticles.length > 0) {
        // Simple cleanup: remove special chars if needed
        const t1 = topArticles[0].title.replace(/\|/g, '-');
        dynamicTitle += `${t1}`;

        if (topArticles.length > 1) {
            const t2 = topArticles[1].title.replace(/\|/g, '-');
            // Check approximate length (Social/Search limit ~60 chars)
            if ((dynamicTitle.length + t2.length + 25) < 65) {
                dynamicTitle += `、${t2}`;
            }
        }
        dynamicTitle += ` | RSS Briefing Hub`;
    } else {
        dynamicTitle += `Briefing | RSS Briefing Hub`;
    }

    return {
        title: dynamicTitle,
        description: description,
        keywords: topKeywords, // Inject explicit keywords tag
        alternates: {
            canonical: `/date/${date}`,
        },
        openGraph: {
            title: dynamicTitle,
            description: description,
            type: 'article',
            publishedTime: date,
            images: [
                {
                    url: headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
                    width: 1600,
                    height: 1200,
                    alt: `${date} Briefing Cover`,
                }
            ],
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

    // Construct consistent description for JSON-LD (Same as Metadata)
    const tldrList = allArticles
        .slice(0, 10)
        .map((a, i) => `${i + 1}. ${a.tldr || a.title}`)
        .join(' ');

    const description = tldrList
        ? `${date} 每日简报。本期要点：${tldrList}`
        : `${date} 每日精选简报。汇聚科技新闻与 RSS 订阅精华。`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: `${date} Briefing | 每日简报`,
        image: {
            '@type': 'ImageObject',
            'url': headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg' // Fallback image
        },
        description: description,
        datePublished: `${date}T08:00:00+08:00`, // ISO 8601 with +08:00 timezone (assuming 8 AM Shanghai)
        author: [{
            '@type': 'Organization',
            name: 'Briefing Hub',
            url: 'https://www.alok-rss.top'
        }],
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: allArticles.map((article, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://www.alok-rss.top/article/${article.id}`,
                name: article.title,
                // Enhanced Rich Snippet: Use the full AI summary for deep content understanding
                description: article.summary || article.tldr || ''
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
