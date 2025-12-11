import { fetchAvailableDates, fetchBriefingData } from './lib/data';
import { fetchFilteredArticlesSSR } from './lib/server/ssr-helpers';
import MainContentClient from './components/MainContentClient';
import { resolveBriefingImage } from '../services/articleLoader';
import { Metadata } from 'next';
import { Filter } from '../types';

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

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
    const params = await searchParams;
    const filterType = typeof params.filter === 'string' ? params.filter : undefined;
    const filterValue = typeof params.value === 'string' ? params.value : undefined;

    // Handle Category/Tag/Search Metadata
    if (filterType && filterValue) {
        // Simple SSR fetch for metadata titles (optional, or just use value)
        // For performance, we might skip full fetch if we trust value.
        // But let's be accurate.
        return {
            title: `${decodeURIComponent(filterValue)} - Article List`,
            description: `Articles filtered by ${filterType}: ${decodeURIComponent(filterValue)}`,
        };
    }

    // Default Briefing Metadata
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

export default async function Home(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await props.searchParams;
    const filterType = typeof params?.filter === 'string' ? params.filter : undefined;
    const filterValue = typeof params?.value === 'string' ? params.value : undefined;

    let initialData: any = {};
    let initialFilter: Filter | null = null;
    let briefingDates: string[] = [];

    if (filterType && filterValue) {
        // Category / Tag / Search View
        const { articles, continuation } = await fetchFilteredArticlesSSR(filterValue, 20, true);
        initialData = {
            initialArticles: articles,
            initialContinuation: continuation
        };
        initialFilter = { type: filterType as any, value: filterValue };

        // Use empty dates or fetch distinct dates if needed for UI? MainContentClient handles dates via Sidebar.
        // Sidebar dates are fetched in MainLayout -> SidebarClient.
    } else {
        // Default Briefing View
        const { initialDate, articles, headerImageUrl, dates } = await getLatestBriefingData();
        initialData = {
            initialDate,
            initialHeaderImageUrl: headerImageUrl,
            initialArticles: articles,
            initialContinuation: null
        };
        // If initialDate exists, activeFilter should be 'date'
        if (initialDate) {
            initialFilter = { type: 'date', value: initialDate };
        }
        briefingDates = dates || []; // Use default empty array for dates if undefined
    }

    const renderSchemas = [];
    if (initialData.initialDate && initialData.initialArticles?.length > 0) {
        const date = initialData.initialDate;
        const articles = initialData.initialArticles;
        renderSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: `${date} Briefing | 每日简报`,
            image: {
                '@type': 'ImageObject',
                'url': initialData.initialHeaderImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg'
            },
            description: `Daily Briefing for ${date}`,
            datePublished: `${date}T08:00:00+08:00`,
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: articles.map((article: any, index: number) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `https://www.alok-rss.top/article/${article.id}`,
                    name: article.title
                }))
            }
        });
    }

    return (
        <>
            {renderSchemas.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(renderSchemas) }}
                />
            )}
            <MainContentClient
                initialDate={initialData.initialDate}
                initialHeaderImageUrl={initialData.initialHeaderImageUrl}
                initialArticles={initialData.initialArticles}
                // New Props
                initialActiveFilter={initialFilter}
                initialContinuation={initialData.initialContinuation}
            />
        </>
    );
}
