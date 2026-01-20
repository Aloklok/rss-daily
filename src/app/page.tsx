import { fetchAvailableDates, fetchBriefingData } from '@/domains/reading/services';
import MainContentClient from '@/shared/components/layout/MainContentClient';
import { resolveBriefingImage } from '@/shared/utils/imageUtils';
import { Metadata } from 'next';
import { Filter } from '@/shared/types';
import { BRIEFING_IMAGE_WIDTH, BRIEFING_IMAGE_HEIGHT } from '@/domains/intelligence/constants';
import { toShortId } from '@/shared/utils/idHelpers';
import { getCurrentTimeSlot, getTodayInShanghai } from '@/domains/reading/utils/date';

// [Scheme C Optimization] Converted to ISR for performance
// Webhook mechanism ensures cache invalidation when content changes
export const revalidate = 604800; // 7 days
export const dynamic = 'force-static'; // Force static to prevent layout data fetch from making it dynamic

async function getLatestBriefingData() {
  const initialDate = getTodayInShanghai();

  const [dates, groupedArticles, headerImageUrl] = await Promise.all([
    fetchAvailableDates().catch(() => []),
    fetchBriefingData(initialDate).catch(() => ({})),
    resolveBriefingImage(initialDate).catch(() => null),
  ]);

  const articles = Object.values(groupedArticles).flat();

  return { initialDate, articles, headerImageUrl, dates };
}

// 3. Static Metadata for Homepage
export async function generateMetadata(): Promise<Metadata> {
  const { initialDate, headerImageUrl } = await getLatestBriefingData();

  return {
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

export default async function Home() {
  // Pure Static Homepage: No searchParams usage
  // Always render the default "Latest Briefing" view

  // SSR Tags Prefetching & Initial Data Fetching in parallel
  const { fetchTagsServer } = await import('@/domains/reading/services');
  const [briefing, tagsResult] = await Promise.all([
    getLatestBriefingData(),
    fetchTagsServer().catch(() => ({ tags: [] })),
  ]);

  const tags = (tagsResult as any).tags;
  const initialFilter: Filter | null = null; // Default view has no filter

  const renderSchemas = [];
  if (briefing.initialDate && briefing.articles?.length > 0) {
    const date = briefing.initialDate;
    const articles = briefing.articles;
    renderSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: `${date} Briefing | 每日简报`,
      image: {
        '@type': 'ImageObject',
        url: briefing.headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
      },
      description: `Daily Briefing for ${date}`,
      datePublished: `${date}T08:00:00+08:00`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articles.slice(0, 20).map((article: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://www.alok-rss.top/article/${toShortId(String(article.id))}`,
          name: article.title,
        })),
      },
    });
  }

  // Calculate initialTimeSlot for Homepage (Today) to prevent filtering flash
  const initialTimeSlot = getCurrentTimeSlot();

  return (
    <>
      {renderSchemas.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(renderSchemas) }}
        />
      )}
      <MainContentClient
        initialDate={briefing.initialDate}
        initialHeaderImageUrl={briefing.headerImageUrl || undefined}
        initialArticles={briefing.articles}
        // Static Props
        initialActiveFilter={initialFilter}
        initialContinuation={null}
        isHomepage={true} // Always true for static root
        initialTimeSlot={initialTimeSlot}
        initialTags={tags}
        today={getTodayInShanghai()}
      />
    </>
  );
}
