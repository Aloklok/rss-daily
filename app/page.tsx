import { fetchAvailableDates, fetchBriefingData } from '@/lib/server/dataFetcher';
import { fetchFilteredArticlesSSR } from './lib/server/ssr-helpers';
import MainContentClient from '@/components/layout/MainContentClient';
import { resolveBriefingImage } from '@/utils/imageUtils';
import { Metadata } from 'next';
import { Filter } from '../types';
import { BRIEFING_IMAGE_WIDTH, BRIEFING_IMAGE_HEIGHT } from '@/lib/constants';
import { toShortId } from '@/utils/idHelpers';
import { getCurrentTimeSlot, getTodayInShanghai } from '@/utils/dateUtils';

export const dynamic = 'force-dynamic';

async function getLatestBriefingData() {
  const dates = await fetchAvailableDates();
  const initialDate = dates.length > 0 ? dates[0] : undefined;

  if (!initialDate)
    return {
      initialDate: undefined,
      articles: [],
      headerImageUrl: undefined,
      dates: [],
    };

  const groupedArticles = await fetchBriefingData(initialDate);
  let articles = Object.values(groupedArticles).flat();
  const headerImageUrl = await resolveBriefingImage(initialDate);

  // Server-Side State Merging: Directly merge states into articles for zero-flicker first paint
  if (articles.length > 0) {
    const { fetchArticleStatesServer } = await import('@/lib/server/dataFetcher');
    const states = await fetchArticleStatesServer(articles.map((a) => a.id));
    articles = articles.map((article) => ({
      ...article,
      tags: states[article.id] || article.tags || [],
    }));
  }

  // Return dates as well so we can build the archive schema
  return { initialDate, articles, headerImageUrl, dates };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const filterType = typeof params.filter === 'string' ? params.filter : undefined;
  const filterValue = typeof params.value === 'string' ? params.value : undefined;

  // 1. Handle "Date" Filter explicitly (Match /date/[date] logic)
  if (filterType === 'date' && filterValue) {
    // Fetch specific date data
    const grouped = await fetchBriefingData(filterValue);
    const dateArticles = Object.values(grouped).flat();
    const topImage = await resolveBriefingImage(filterValue);

    // If no articles for the date, return a generic fallback for that date
    if (dateArticles.length === 0) {
      return {
        title: `${filterValue} Briefing`,
        description: `${filterValue} 每日精选简报。汇聚科技新闻与 RSS 订阅精华。`,
        openGraph: {
          title: `${filterValue} Briefing | RSS简报`,
          description: `${filterValue} 每日精选简报。汇聚科技新闻与 RSS 订阅精华。`,
          images: [
            {
              url: topImage || 'https://www.alok-rss.top/computer_cat_180.jpeg',
              width: BRIEFING_IMAGE_WIDTH,
              height: BRIEFING_IMAGE_HEIGHT,
              alt: `${filterValue} Briefing`,
            },
          ],
        },
      };
    }

    // Sorting Logic: Priority > Score
    const PRIORITY_MAP: Record<string, number> = {
      重要新闻: 3,
      必知要闻: 2,
      常规更新: 1,
    };
    const sorted = [...dateArticles].sort((a, b) => {
      // Get raw importance string
      const sectionA = a.briefingSection || a.verdict?.importance || '常规更新';
      const sectionB = b.briefingSection || b.verdict?.importance || '常规更新';

      const pA = PRIORITY_MAP[sectionA] || 0;
      const pB = PRIORITY_MAP[sectionB] || 0;

      if (pA !== pB) return pB - pA;
      return (b.verdict?.score || 0) - (a.verdict?.score || 0);
    });

    const top2 = sorted.slice(0, 2);
    let dynamicTitle = `${filterValue} `;
    if (top2.length > 0) {
      const t1 = top2[0].title.replace(/\|/g, '-');
      dynamicTitle += `${t1}`;
      if (top2.length > 1) {
        const t2 = top2[1].title.replace(/\|/g, '-');
        // Check approximate length (Social/Search limit ~60 chars)
        // Relaxed limit to 100 to ensure 2nd title shows (User Preference > Strict SEO No-Truncation)
        if (dynamicTitle.length + t2.length < 100) {
          dynamicTitle += `、${t2}`;
        }
      }
      // Layout template adds brand suffix
    } else {
      dynamicTitle += `Briefing`;
    }

    const tldrList = dateArticles
      .slice(0, 10)
      .map((a, i) => `${i + 1}. ${a.tldr || a.title}`)
      .join(' ');
    const desc = tldrList
      ? `${filterValue} 每日简报。本期要点：${tldrList}`
      : `${filterValue} 每日精选简报。汇聚科技新闻与 RSS 订阅精华。`;

    return {
      title: dynamicTitle,
      description: desc,
      alternates: {
        canonical: `https://www.alok-rss.top/date/${filterValue}`,
      },
      openGraph: {
        title: dynamicTitle,
        description: desc,
        type: 'website',
        url: `https://www.alok-rss.top/date/${filterValue}`,
        siteName: 'RSS Briefing Hub',
        images: [
          {
            url: topImage || 'https://www.alok-rss.top/computer_cat_180.jpeg',
            width: BRIEFING_IMAGE_WIDTH,
            height: BRIEFING_IMAGE_HEIGHT,
            alt: `${filterValue} Briefing`,
          },
        ],
      },
    };
  }

  // 2. Handle Other Filters (Category/Tag/Search)
  if (filterType && filterValue) {
    return {
      title: `${decodeURIComponent(filterValue)} - Article List`,
      description: `Articles filtered by ${filterType}: ${decodeURIComponent(filterValue)}`,
      alternates: {
        canonical: `https://www.alok-rss.top/?filter=${filterType}&value=${filterValue}`,
      },
      openGraph: {
        title: `${decodeURIComponent(filterValue)} - Article List`,
        description: `Articles filtered by ${filterType}: ${decodeURIComponent(filterValue)}`,
        type: 'website',
        url: `https://www.alok-rss.top/?filter=${filterType}&value=${filterValue}`,
        siteName: 'RSS Briefing Hub',
        images: [
          {
            url: 'https://www.alok-rss.top/computer_cat_180.jpeg', // Generic image for filtered lists
            width: BRIEFING_IMAGE_WIDTH,
            height: BRIEFING_IMAGE_HEIGHT,
            alt: `Filtered Articles`,
          },
        ],
      },
    };
  }

  // 3. Default Homepage (No Filters) -> Brand Title
  const { initialDate, headerImageUrl } = await getLatestBriefingData();

  return {
    // Title & Description are omitted to inherit from layout.tsx (Brand Strategy)
    alternates: {
      canonical: 'https://www.alok-rss.top',
    },
    openGraph: {
      // Inherit Title/Desc from layout.tsx automatically (Next.js Deep Merge)
      type: 'website',
      url: 'https://www.alok-rss.top',
      siteName: 'RSS Briefing Hub',
      images: [
        {
          url: headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
          width: BRIEFING_IMAGE_WIDTH,
          height: BRIEFING_IMAGE_HEIGHT,
          alt: `${initialDate} Briefing Cover`,
        },
      ],
    },
  };
}

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.searchParams;
  const filterType = typeof params?.filter === 'string' ? params.filter : undefined;
  const filterValue = typeof params?.value === 'string' ? params.value : undefined;

  let initialData: any = {};
  let initialFilter: Filter | null = null;

  if (filterType && filterValue) {
    // Category / Tag / Search View
    const result = await fetchFilteredArticlesSSR(filterValue, 20, true);
    let articles = result.articles;
    const continuation = result.continuation;

    // Server-Side State Merging for Article States (Category/Tag)
    // Directly merge states into articles for zero-flicker first paint
    if (articles.length > 0) {
      const { fetchArticleStatesServer } = await import('@/lib/server/dataFetcher');
      const states = await fetchArticleStatesServer(articles.map((a) => a.id));
      articles = articles.map((article) => ({
        ...article,
        tags: states[article.id] || article.tags || [],
      }));
    }

    initialData = {
      initialArticles: articles,
      initialContinuation: continuation,
    };
    initialFilter = { type: filterType as any, value: filterValue };
  } else {
    // Default Briefing View
    const { initialDate, articles, headerImageUrl } = await getLatestBriefingData();
    initialData = {
      initialDate,
      initialHeaderImageUrl: headerImageUrl,
      initialArticles: articles,
      initialContinuation: null,
    };
    // If initialDate exists, activeFilter should be 'date'
    if (initialDate) {
      initialFilter = { type: 'date', value: initialDate };
    }
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
        url: initialData.initialHeaderImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
      },
      description: `Daily Briefing for ${date}`,
      datePublished: `${date}T08:00:00+08:00`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articles.map((article: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://www.alok-rss.top/article/${toShortId(String(article.id))}`,
          name: article.title,
        })),
      },
    });
  }

  // Calculate initialTimeSlot for Homepage (Today) to prevent filtering flash
  // We only do this for the default view (no filterParam) which represents "Today"
  const isDefaultView = !filterType && !filterValue;
  const initialTimeSlot = isDefaultView ? getCurrentTimeSlot() : null;

  // SSR Tags Prefetching
  // Fetch tags for Client Store hydration
  const { fetchTagsServer } = await import('@/lib/server/tagFetcher');
  const { tags } = await fetchTagsServer();

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
        isHomepage={isDefaultView} // Pass true only if no filters are active
        initialTimeSlot={initialTimeSlot}
        initialTags={tags}
        today={getTodayInShanghai()}
      />
    </>
  );
}
