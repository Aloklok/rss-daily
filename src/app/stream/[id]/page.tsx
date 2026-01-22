import React from 'react';
import ArticleListHeader from '@/domains/reading/components/stream/StreamHeader';
import StreamList from '@/domains/reading/components/stream/StreamContainer';
import { fetchFilteredArticlesSSR } from '@/app/lib/server/ssr-helpers';
import { getAvailableFilters } from '@/domains/reading/services';
import { notFound } from 'next/navigation';
import { logBotError } from '@/app/lib/server/log-bot-error';

// Enable ISR (Incremental Static Regeneration)
// Revalidate every 7 days (604800 seconds), relying on on-demand revalidation for updates
export const revalidate = 604800;
export const dynamicParams = true; // Allow generating pages for new tags on demand

// Helper to extract top keywords from a list of articles
function getTopKeywords(articles: any[], limit = 10): string[] {
  const frequency: Record<string, number> = {};
  articles.forEach((article) => {
    if (Array.isArray(article.keywords)) {
      article.keywords.forEach((k: string) => {
        // Normalize: lowercase and trim
        const cleanKey = k.trim();
        if (cleanKey) {
          frequency[cleanKey] = (frequency[cleanKey] || 0) + 1;
        }
      });
    }
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a) // Sort by descending frequency
    .slice(0, limit)
    .map(([key]) => key);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const tagName = decodedId.split('/').pop() || decodedId;

  const { articles } = await fetchFilteredArticlesSSR(decodedId, 20, true);
  const topKeywords = getTopKeywords(articles, 8);

  // Indexing Threshold: Only index if there is at least 1 article.
  // This avoids polluting the index with empty tags.
  const shouldIndex = articles && articles.length > 0;

  return {
    title: `${tagName} - AI Insights & Briefings`,
    description: `Explore AI-curated insights for ${tagName}, covering topics like ${topKeywords.join(', ')}. Daily updates, market takes, and critical analysis.`,
    keywords: topKeywords,
    robots: {
      index: shouldIndex, // Only index if content exists
      follow: true,
    },
    alternates: {
      canonical: `/stream/${id}`, // Self-referencing canonical to prevent duplicate content issues
    },
  };
}

export default async function StreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const tagName = decodedId.split('/').pop() || decodedId;

  let articlesData;
  let filtersData;
  let errorReason: string | undefined;

  try {
    // Parallel fetch for efficiency
    [articlesData, filtersData] = await Promise.all([
      fetchFilteredArticlesSSR(decodedId, 20, true),
      getAvailableFilters(),
    ]);
  } catch (e: any) {
    console.error(`[StreamPage] Service call failed for ${decodedId}:`, e);
    errorReason = `FreshRSS异常: ${e.message || 'unknown'}`;
  }

  // Service call failed - log and show 404
  if (errorReason) {
    await logBotError(`/stream/${id}`, errorReason);
    notFound();
  }

  const { articles, continuation } = articlesData!;
  const { categories } = filtersData!;

  // Extract keywords for UI
  const relatedTopics = getTopKeywords(articles, 8); // Reduced to 8 for cleaner header

  // Determine if this is a Category by checking the API source of truth
  // Categories are defined as folders in FreshRSS
  const isCategory = categories.some((cat) => cat.id === decodedId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ArticleListHeader
        title={tagName}
        count={articles.length}
        showCount={!isCategory}
        description={relatedTopics.length > 0 ? relatedTopics.join(', ') : undefined}
      />

      <StreamList
        filterValue={decodedId}
        initialArticles={articles}
        initialContinuation={continuation}
      />
    </div>
  );
}
