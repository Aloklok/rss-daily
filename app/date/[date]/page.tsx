import React from 'react';
import { Metadata } from 'next';
import {
  fetchBriefingData,
  fetchAvailableDates,
  getTodayInShanghai,
} from '@/lib/server/dataFetcher';

import BriefingClient from '@/components/features/briefing/BriefingClient';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveBriefingImage } from '@/utils/imageUtils';
import { BRIEFING_IMAGE_WIDTH, BRIEFING_IMAGE_HEIGHT } from '@/lib/constants';
import { toShortId } from '@/utils/idHelpers';

// For "Today", we will use noStore() to opt out of caching.
// export const revalidate = 604800; // Removed to prevent DYNAMIC_SERVER_USAGE error

export async function generateStaticParams() {
  const dates = await fetchAvailableDates();
  const today = getTodayInShanghai();

  // Exclude today from static generation to ensure it's always treated as dynamic (SSR) initially
  // and to avoid building a stale version at build time.
  return dates
    .filter((date) => date !== today)
    .map((date) => ({
      date: date,
    }));
}

// Helper to extract top keywords from articles
// Helper to extract top keywords with diversity (Round Robin)
function getTopKeywords(articles: any[], limit = 10): string[] {
  const frequency: Record<string, number> = {};
  const articleKeywordsMap: Record<number, string[]> = {};

  // 1. Calculate Frequency and build map
  articles.forEach((article, index) => {
    if (Array.isArray(article.keywords)) {
      const kws: string[] = [];
      article.keywords.forEach((k: string) => {
        const cleanKey = k.trim();
        // Exclude common but generic terms if needed
        if (cleanKey && cleanKey.length > 1) {
          frequency[cleanKey] = (frequency[cleanKey] || 0) + 1;
          kws.push(cleanKey);
        }
      });
      articleKeywordsMap[index] = kws;
    }
  });

  // 2. Separate High Frequency (>1) Keywords
  const allUniqueKeywords = Object.keys(frequency);
  const highFreqKeywords = allUniqueKeywords
    .filter((k) => frequency[k] > 1)
    .sort((a, b) => frequency[b] - frequency[a]);

  // 3. Round-Robin Selection for Diversity
  const selectedKeywords = new Set<string>();

  // Add high frequency keywords first
  for (const k of highFreqKeywords) {
    if (selectedKeywords.size >= limit) break;
    selectedKeywords.add(k);
  }

  // Fill remaining slots using Round-Robin across articles
  let round = 0;
  let addedInRound = true;

  // Continue until limit reached or no more keywords can be added
  while (selectedKeywords.size < limit && addedInRound) {
    addedInRound = false;
    for (let i = 0; i < articles.length; i++) {
      if (selectedKeywords.size >= limit) break;

      const kws = articleKeywordsMap[i] || [];
      // Find the first keyword in this article that hasn't been used yet
      // If round > 0, we might pick the 2nd, 3rd, etc. keyword
      if (round < kws.length) {
        const candidate = kws[round];
        // Only if available and not already selected (e.g. was high freq)
        if (candidate && !selectedKeywords.has(candidate)) {
          selectedKeywords.add(candidate);
          addedInRound = true;
        }
      } else {
        // Try finding any unused keyword in this article if simple round lookup failed
        // (e.g. sparse arrays), but simple round index is usually enough for "Top N" approximation
        const unused = kws.find((k) => !selectedKeywords.has(k));
        if (unused) {
          selectedKeywords.add(unused);
          addedInRound = true;
        }
      }
    }
    round++;
  }

  return Array.from(selectedKeywords);
}

const PRIORITY_MAP: Record<string, number> = {
  重要新闻: 3,
  必知要闻: 2,
  常规更新: 1,
};

function getSortedArticles(articles: any[]) {
  return [...articles].sort((a, b) => {
    const sectionA = a.briefingSection || a.verdict?.importance || '常规更新';
    const sectionB = b.briefingSection || b.verdict?.importance || '常规更新';

    const pA = PRIORITY_MAP[sectionA] || 0;
    const pB = PRIORITY_MAP[sectionB] || 0;

    if (pA !== pB) return pB - pA; // Higher priority first
    return (b.verdict?.score || 0) - (a.verdict?.score || 0); // Higher score first within priority
  });
}

function generateHighDensityDescription(date: string, allArticles: any[]) {
  if (allArticles.length === 0) return `${date} 每日简报。汇聚科技新闻与 RSS 订阅精华。`;

  const sortedArticles = getSortedArticles(allArticles);

  // Top 3 Headlines (Using TLDR if available, else Title)
  const top3Titles = sortedArticles.slice(0, 3).map((a) => {
    const text = a.tldr || a.title;
    // Remove pipe chars from text to avoid confusion with separator, and strip trailing punctuation
    return text
      .replace(/\|/g, '-')
      .replace(/[。，.,;；!！\s]+$/, '')
      .trim();
  });

  // Keywords (extracted from ALL articles to represent the breadth)
  // We get top 8, then take top 5 for the clean string
  const topKeywords = getTopKeywords(allArticles, 10).slice(0, 5);

  // Format: 2025-12-12 简报：TLDR1 | TLDR2 | TLDR3。涵盖Keyword1...
  let desc = `${date} 简报：${top3Titles.join(' | ')}`;

  if (allArticles.length > 3) {
    desc += `。涵盖${topKeywords.join('、')}等${allArticles.length}条技术精选。`;
  } else {
    desc += `。今日${allArticles.length}条更新。`;
  }

  return desc;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;

  // Fetch data for dynamic description
  const groupedArticles = await fetchBriefingData(date);
  const allArticles = Object.values(groupedArticles).flat();

  // Auto-SEO: Extract keywords
  const topKeywords = getTopKeywords(allArticles, 10);

  // Fetch header image for metadata
  const headerImageUrl = await resolveBriefingImage(date);

  // High Density Description
  const description = generateHighDensityDescription(date, allArticles);

  // Dynamic Title Generation: "Title Party" Mode
  const sortedForTitle = getSortedArticles(allArticles);

  const topArticles = sortedForTitle.slice(0, 2); // Get top 2
  let dynamicTitle = `${date} `;

  if (topArticles.length > 0) {
    // Simple cleanup: remove special chars if needed
    const rawTitle = topArticles[0].tldr || topArticles[0].title;
    const t1 = rawTitle.replace(/\|/g, '-');
    dynamicTitle += `${t1}`;
    // Strategy A: Only 1st title
    // dynamicTitle += ` | RSS Briefing Hub`; // Removed to avoid duplication with layout template
  } else {
    dynamicTitle += `Briefing`;
  }

  return {
    title: dynamicTitle,
    description: description,
    keywords: topKeywords, // Inject explicit keywords tag
    // Dynamic Robot Control:
    // If we have content, index it. If empty (timeout/error), do not index but follow links.
    // This prevents "Soft 404" penalties while keeping the page accessible to users.
    robots: {
      index: allArticles.length > 0,
      follow: true,
    },
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
          width: BRIEFING_IMAGE_WIDTH,
          height: BRIEFING_IMAGE_HEIGHT,
          alt: `${date} Briefing Cover`,
        },
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

  // Prefetch header image
  const headerImageUrl = await resolveBriefingImage(date);

  // Consistent High Density Description
  const description = generateHighDensityDescription(date, allArticles);

  // [Optimization] Server-Side State Fetching for "Today"
  // Since "Today" is rendered dynamically (SSR), we can fetch user states (Read/Star) here
  // to avoid the initial "all unread" flash and subsequent slow client-side fetch.
  let initialArticleStates: { [key: string]: string[] } | undefined;
  if (date === today && allArticles.length > 0) {
    // Only fetch if we have articles to check
    // Dynamic import to avoid circular dependencies if any, though here it is fine.
    const { fetchArticleStatesServer } = await import('@/lib/server/dataFetcher');
    const articleIds = allArticles.map((a) => a.id);
    initialArticleStates = await fetchArticleStatesServer(articleIds);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: `${date} Briefing | 每日简报`,
    image: {
      '@type': 'ImageObject',
      url: headerImageUrl || 'https://www.alok-rss.top/computer_cat_180.jpeg', // Fallback image
    },
    description: description,
    datePublished: `${date}T08:00:00+08:00`, // ISO 8601 with +08:00 timezone (assuming 8 AM Shanghai)
    author: [
      {
        '@type': 'Organization',
        name: 'Briefing Hub',
        url: 'https://www.alok-rss.top',
      },
    ],
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: allArticles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://www.alok-rss.top/article/${toShortId(String(article.id))}`,
        name: article.title,
        // Enhanced Rich Snippet: Use the full AI summary for deep content understanding
        description: article.summary || article.tldr || '',
      })),
    },
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
        key={date} // Force remount on date change to ensure clean state (no timeSlot leakage)
        articles={allArticles}
        date={date}
        headerImageUrl={headerImageUrl}
        isToday={date === today}
        prevDate={prevDate}
        nextDate={nextDate}
        initialArticleStates={initialArticleStates}
      />
    </>
  );
}
