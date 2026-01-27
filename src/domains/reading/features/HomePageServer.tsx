import {
  fetchAvailableDates,
  fetchBriefingData,
  fetchTagsServer,
} from '@/domains/reading/services';
import { resolveBriefingImage } from '@/shared/utils/imageUtils';
import { Metadata } from 'next';
import { Filter } from '@/shared/types';
import { BRIEFING_IMAGE_WIDTH, BRIEFING_IMAGE_HEIGHT } from '@/domains/intelligence/constants';
import { toShortId } from '@/shared/utils/idHelpers';
import { getCurrentTimeSlot, getTodayInShanghai } from '@/domains/reading/utils/date';
import MainContentClient from '@/shared/components/layout/MainContentClient';
import { zh, en } from '@/app/i18n/dictionaries';
import { getDisplayLabel } from '@/domains/reading/utils/label-display';

type Lang = 'zh' | 'en';

interface PageProps {
  lang: Lang;
}

// Data Fetcher
async function getHomePageData(lang: Lang) {
  const initialDate = getTodayInShanghai();

  // Parallel Fetching
  const [dates, groupedArticles, headerImageUrl, tagsResult] = await Promise.all([
    fetchAvailableDates().catch(() => []),
    // Use the appropriate fetcher based on language
    lang === 'en'
      ? fetchBriefingData(initialDate, 'en').catch(() => ({}))
      : fetchBriefingData(initialDate, 'zh').catch(() => ({})),
    resolveBriefingImage(initialDate).catch(() => null),
    fetchTagsServer().catch(() => ({ tags: [] })),
  ]);

  const articles = Object.values(groupedArticles).flat();
  const rawTags = (tagsResult as any).tags || [];
  const validTagIds = new Set<string>(rawTags.map((t: any) => String(t.id)));
  const tags = rawTags.map((t: any) => ({
    ...t,
    label: getDisplayLabel(t.label, 'tag', lang),
  }));

  // Pure data for SSR
  const { purifyArticles } = await import('@/domains/reading/utils/label-display');
  const clientArticles = purifyArticles(articles, lang, validTagIds);

  return { initialDate, articles: clientArticles, headerImageUrl, dates, tags };
}

// Metadata Generator
export async function generateHomePageMetadata({ lang }: { lang: Lang }): Promise<Metadata> {
  const baseUrl = 'https://www.alok-rss.top';
  const url = lang === 'en' ? `${baseUrl}/en` : baseUrl;

  try {
    const { initialDate, headerImageUrl } = await getHomePageData(lang);

    const title =
      lang === 'en'
        ? 'RSS Briefing Hub - Full Stack Tech Radar'
        : 'RSS Briefing Hub - 全栈技术资讯雷达 | 聚焦架构设计、AI趋势与云原生';

    return {
      title: title,
      alternates: {
        canonical: url,
        languages: {
          zh: baseUrl,
          en: `${baseUrl}/en`,
        },
      },
      openGraph: {
        type: 'website',
        url: url,
        siteName: 'RSS Briefing Hub',
        title: title,
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
  } catch (error) {
    console.error('generateHomePageMetadata error:', error);
    return {
      title: 'RSS Briefing Hub - Daily Updates',
      alternates: {
        canonical: url,
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

// Main Component
export async function HomePage({ lang }: PageProps) {
  const data = await getHomePageData(lang);
  const dict = lang === 'en' ? en : zh;
  const initialFilter: Filter | null = null;
  const initialTimeSlot = getCurrentTimeSlot();
  const tableName = lang === 'en' ? 'articles_view_en' : 'articles_view';

  // JSON-LD Generation
  const renderSchemas = [];
  if (data.initialDate && data.articles?.length > 0) {
    const headline =
      lang === 'en'
        ? `${data.initialDate} Tech Briefing`
        : `${data.initialDate} Briefing | 每日简报`;

    const description = `Daily Briefing for ${data.initialDate}`;

    renderSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: headline,
      image: {
        '@type': 'ImageObject',
        url: data.headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg',
      },
      description: description,
      datePublished: `${data.initialDate}T08:00:00+08:00`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: data.articles.slice(0, 20).map((article: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://www.alok-rss.top/article/${toShortId(String(article.id))}`,
          name: article.title,
        })),
      },
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
        initialDate={data.initialDate}
        initialHeaderImageUrl={data.headerImageUrl || undefined}
        initialArticles={data.articles}
        // Static Props
        initialActiveFilter={initialFilter}
        initialContinuation={null}
        isHomepage={true}
        initialTimeSlot={initialTimeSlot}
        initialTags={data.tags}
        today={getTodayInShanghai()}
        dict={dict}
        tableName={tableName}
      />
    </>
  );
}
