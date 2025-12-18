import { fetchArticleById, fetchArticleContentServer } from '@/lib/server/dataFetcher';
import { Metadata } from 'next';
import ArticleDetailClient from '@/components/features/article/ArticleDetailClient';
import { notFound } from 'next/navigation';
import { stripTags } from '../../../utils/contentUtils';

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
  if (!article) notFound();

  // 2. Fetch full content (FreshRSS) - Server Side
  const content = await fetchArticleContentServer(article.id);

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
