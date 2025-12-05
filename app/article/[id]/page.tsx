import React from 'react';
import { fetchArticleById } from '../../lib/data';
import ArticleDetailClient from '../../components/ArticleDetailClient';
import { notFound } from 'next/navigation';

export const revalidate = false;

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const article = await fetchArticleById(id);
    if (!article) notFound();

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <ArticleDetailClient article={article} />
        </div>
    );
}
