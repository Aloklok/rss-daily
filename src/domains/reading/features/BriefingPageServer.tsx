import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBriefingData, fetchAvailableDates } from '@/domains/reading/services';
import { BRIEFING_IMAGE_WIDTH, BRIEFING_IMAGE_HEIGHT } from '@/domains/intelligence/constants';
import BriefingClient from '@/domains/reading/components/briefing/BriefingClient';
import { getTodayInShanghai } from '@/domains/reading/utils/date';
import { logBotError } from '@/app/lib/server/log-bot-error';
import { resolveBriefingImage } from '@/shared/utils/imageUtils';
import { toShortId } from '@/shared/utils/idHelpers';
import { zh, en } from '@/app/i18n/dictionaries';
import { generateHighDensityDescription, getTopKeywords, getSortedArticles } from '@/domains/reading/utils/seo';

type Lang = 'zh' | 'en';

interface PageProps {
    params: Promise<{ date: string }>;
    lang: Lang;
}

export async function generateBriefingMetadata({ params, lang }: PageProps): Promise<Metadata> {
    const { date } = await params;

    // Fetch data appropriately
    const grouped = await fetchBriefingData(date, lang);
    const allArticles = Object.values(grouped).flat();

    const headerImageUrl = await resolveBriefingImage(date);
    const description = generateHighDensityDescription(date, allArticles, lang);

    // Title generation
    let dynamicTitle = '';
    if (lang === 'en') {
        if (allArticles.length > 0) {
            const sorted = getSortedArticles(allArticles);
            const top = sorted[0].tldr || sorted[0].title;
            const cleanTop = top.replace(/\|/g, '-');
            dynamicTitle = `${date} Tech Briefing | ${cleanTop}`;
        } else {
            dynamicTitle = `${date} Tech Briefing`;
        }
    } else {
        const sorted = getSortedArticles(allArticles);
        const topArticles = sorted.slice(0, 2);
        dynamicTitle = `${date} `;
        if (topArticles.length > 0) {
            const rawTitle = topArticles[0].tldr || topArticles[0].title;
            dynamicTitle += `${rawTitle.replace(/\|/g, '-')} `;
        } else {
            dynamicTitle += `Briefing`;
        }
    }

    const alternates = {
        canonical: lang === 'en' ? `/en/date/${date}` : `/date/${date}`,
        languages: {
            'zh': `/date/${date}`,
            'en': `/en/date/${date}`,
        },
    };

    return {
        title: dynamicTitle,
        description: description,
        keywords: lang === 'zh' ? getTopKeywords(allArticles, 10) : ['Tech News', 'Daily Briefing'], // Enhancements possible
        robots: {
            index: allArticles.length > 0,
            follow: true,
        },
        alternates,
        openGraph: {
            title: dynamicTitle,
            description,
            type: 'article',
            publishedTime: date,
            images: [
                {
                    url: headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
                    width: BRIEFING_IMAGE_WIDTH,
                    height: BRIEFING_IMAGE_HEIGHT,
                    alt: `${date} Briefing Cover`,
                }
            ]
        }
    };
}

export async function BriefingPage({ params, lang }: PageProps) {
    const { date } = await params;
    const today = getTodayInShanghai();

    // Data Fetching
    let groupedArticles;
    try {
        groupedArticles = await fetchBriefingData(date, lang);
    } catch (e) {
        console.error(`Failed to fetch briefing data for ${date} (${lang})`, e);
        groupedArticles = {};
    }

    const allArticles = Object.values(groupedArticles).flat();

    if (allArticles.length === 0) {
        if (lang === 'zh') {
            await logBotError(`/date/${date}`, '数据不存在: 该日期无文章');
        }
        notFound();
    }

    const headerImageUrl = await resolveBriefingImage(date);
    const description = generateHighDensityDescription(date, allArticles, lang);
    const dict = lang === 'en' ? en : zh;

    // JSON-LD
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: lang === 'en' ? `${date} Tech Briefing` : `${date} Briefing | 每日简报`,
        image: {
            '@type': 'ImageObject',
            url: headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
        },
        description: description,
        datePublished: `${date}T08:00:00+08:00`,
        author: [
            {
                '@type': 'Organization',
                name: 'Briefing Hub',
                url: lang === 'en' ? 'https://www.alok-rss.top/en' : 'https://www.alok-rss.top',
            },
        ],
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: allArticles.map((article: any, index: number) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://www.alok-rss.top/article/${toShortId(String(article.id))}`,
                name: article.title,
                description: article.summary || article.tldr || '',
            })),
        },
    };

    // Internal Linking
    // Note: This logic assumes dates are same for both langs, which might be true if based on calendar
    const dates = await fetchAvailableDates();
    const currentIndex = dates.indexOf(date);
    const nextDate = currentIndex > 0 ? dates[currentIndex - 1] : null;
    const prevDate = currentIndex < dates.length - 1 ? dates[currentIndex + 1] : null;

    // SSR Tags (ZH only logic originally, but safe to keep empty for EN if needed)
    let initialTags: any[] = [];
    if (lang === 'zh') {
        const { fetchTagsServer } = await import('@/domains/reading/services');
        const { tags } = await fetchTagsServer();
        initialTags = tags;
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BriefingClient
                key={`${lang}-${date}`}
                articles={allArticles}
                date={date}
                headerImageUrl={headerImageUrl}
                isToday={date === today}
                prevDate={prevDate}
                nextDate={nextDate}
                initialTags={initialTags}
                dict={dict}
            />
        </>
    );
}
