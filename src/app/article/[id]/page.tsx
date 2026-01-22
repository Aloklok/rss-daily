import { fetchArticleById, fetchArticleContent } from '@/domains/reading/services';
import { Metadata } from 'next';
import ArticleDetailClient from '@/domains/reading/components/article/ArticleDetailClient';
import { stripTags } from '@/domains/reading/utils/content';
import { notFound } from 'next/navigation';
import { logBotError } from '@/app/lib/server/log-bot-error';

// Revert to Static/ISR for best performance
export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchArticleById(id);

  if (!result.success) {
    return {
      title: 'Article Not Found',
    };
  }

  const article = result.article;

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

  // Fetch article with detailed error tracking
  const result = await fetchArticleById(id);

  // Handle failure with precise error classification
  if (!result.success) {
    const errorSource = result.errorSource;
    const errorMessage = result.errorMessage;

    let reason: string;
    switch (errorSource) {
      case 'supabase':
        reason = `Supabase异常: ${errorMessage}`;
        break;
      case 'freshrss':
        reason = `FreshRSS异常: ${errorMessage}`;
        break;
      case 'both':
        reason = `服务异常: ${errorMessage}`;
        break;
      default:
        reason = `文章不存在: ID ${id}`;
    }

    // 先记录日志（不调用 headers()，不影响 ISR）
    await logBotError(`/article/${id}`, reason);
    // 然后调用 Next.js 原生 notFound()
    notFound();
  }

  const article = result.article;

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
