import React from 'react';
import { fetchArticleById } from '../../lib/data';
import ArticleCard from '../../components/ArticleCard';
import { notFound } from 'next/navigation';

export default async function ArticlePage({ params }: { params: { id: string } }) {
    const article = await fetchArticleById(params.id);
    if (!article) notFound();

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <ArticleCard article={article} showActions={true} />
        </div>
    );
}
