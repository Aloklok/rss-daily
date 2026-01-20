import { fetchArticleById, fetchArticleContent } from '@/domains/reading/services';
import { logServerBotHit } from '@/domains/security/services/bot-logger';
import { headers } from 'next/headers';
import { Metadata } from 'next';
import ArticleDetailClient from '@/domains/reading/components/article/ArticleDetailClient';
import { stripTags } from '@/domains/reading/utils/content';
import NotFound from '../../not-found';

// Revert to Static/ISR for best performance
export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleById(id);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  // Truncate summary for description
  const description = article.summary
    ? stripTags(article.summary).substring(0, 160) + '...'
    : `Read ${article.title} on Briefing Hub | 在 Briefing Hub 阅读 ${article.title}。`;

  return {
    title: article.title,
    description: description,
    alternates: {
      canonical: article.link, // Point to original source for SEO protection
    },
    openGraph: {
      title: article.title,
      description: description,
      type: 'article',
      publishedTime: article.published,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch metadata (Supabase)
  const article = await fetchArticleById(id);
  // Soft 404: Return 200 OK with NotFound UI to avoid SEO penalties/Bing errors
  if (!article) {
    // Audit: Log explicit debug info for bot 404s to Supabase
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    if (userAgent) {
      await logServerBotHit(`/article/${id}`, userAgent, headersList, 404, {
        reason: 'ArticleID not found in DB & FreshRSS Fallback failed',
        attempted_id: id,
        is_fallback_attempted: true,
        // Vercel Edge diagnostics
        edge_region: headersList.get('x-vercel-id')?.split('::')[0] || null,
        request_timestamp: new Date().toISOString(),
      });
    }
    return <NotFound />;
  }

  // 2. Fetch full content (FreshRSS) - Server Side
  // This content is cached by ISR.
  const content = await fetchArticleContent(article.id);

  // NOTE: We do NOT fetch state here in ISR mode.
  // State (Read/Star) is user-specific and dynamic.
  // It will be hydrated by the client (or existing Store state).

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    datePublished: article.published,
    author: [
      {
        '@type': 'Organization',
        name: article.sourceName || 'Briefing Hub',
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Pass initialContent to Client Component for immediate rendering */}
      <ArticleDetailClient article={article} initialContent={content} />
    </div>
  );
}
