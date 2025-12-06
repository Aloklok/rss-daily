import React from 'react';
import { Metadata } from 'next';
import { fetchArticleById } from '../../lib/data';
import ArticleDetailClient from '../../components/ArticleDetailClient';
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const article = await fetchArticleById(id);

    if (!article) {
        return {
            title: 'Article Not Found',
        };
    }

    // Truncate summary for description
    const description = article.summary
        ? article.summary.replace(/<[^>]+>/g, '').substring(0, 160) + '...'
        : `Read ${article.title} on Briefing Hub | 在 Briefing Hub 阅读 ${article.title}。`;

    return {
        title: article.title,
        description: description,
        alternates: {
            canonical: `/article/${id}`,
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
    const article = await fetchArticleById(id);
    if (!article) notFound();

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        datePublished: article.published,
        author: [{
            '@type': 'Organization',
            name: article.sourceName || 'Briefing Hub',
        }],
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ArticleDetailClient article={article} />
        </div>
    );
}
