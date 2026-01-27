import { fetchEnglishArticleById, fetchArticleContent } from '@/domains/reading/services';
import { Metadata } from 'next';
import ArticleDetailClient from '@/domains/reading/components/article/ArticleDetailClient';
import { stripTags } from '@/domains/reading/utils/content';
import { notFound } from 'next/navigation';
import { logBotError } from '@/app/lib/server/log-bot-error';
import { en } from '@/app/i18n/dictionaries';

export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchEnglishArticleById(id);

  if (!result.success) {
    return {
      title: 'Article Not Found',
    };
  }

  const article = result.article;
  const description = article.summary
    ? stripTags(article.summary).substring(0, 160) + '...'
    : `Read ${article.title} on Briefing Hub`;

  return {
    title: article.title,
    description: description,
    alternates: {
      canonical: article.link,
    },
    openGraph: {
      title: article.title,
      description: description,
      type: 'article',
      publishedTime: article.published,
    },
  };
}

export default async function ArticlePageEn({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await fetchEnglishArticleById(id);

  if (!result.success) {
    const reason = `Article not found (EN): ID ${id} - ${result.errorMessage}`;
    await logBotError(`/en/article/${id}`, reason);
    notFound();
  }

  const articleRaw = result.article;
  const { purifyArticle } = await import('@/domains/reading/utils/label-display');
  const article = purifyArticle(articleRaw, 'en');
  const content = await fetchArticleContent(article.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    datePublished: article.published,
    author: [
      {
        '@type': 'Organization',
        name: article.sourceName,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleDetailClient article={article} initialContent={content} dict={en} />
    </div>
  );
}
