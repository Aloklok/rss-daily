'use client';

import React, { useEffect, useMemo } from 'react';
import { useFilteredArticles } from '../../hooks/useArticles';
import StreamArticleListItem from '../../components/StreamArticleListItem';
import { useArticleStore } from '../../store/articleStore';
import { Article } from '../../types';

interface StreamListProps {
    filterValue: string;
    initialArticles: Article[];
    initialContinuation?: string;
}

export default function StreamList({ filterValue, initialArticles, initialContinuation }: StreamListProps) {
    // Construct initialData for useInfiniteQuery
    const initialData = {
        pages: [{
            articles: initialArticles.map(a => a.id),
            continuation: initialContinuation
        }],
        pageParams: [undefined]
    };

    // Pre-populate store with initial articles
    // We need to do this because useFilteredArticles only adds to store in queryFn, 
    // but initialData skips the first queryFn call.
    const addArticles = useArticleStore(state => state.addArticles);
    useEffect(() => {
        addArticles(initialArticles);
    }, [initialArticles, addArticles]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status
    } = useFilteredArticles(filterValue, initialData);

    const articlesById = useArticleStore(state => state.articlesById);

    // Memoize initial articles map for SSR fallback
    const initialArticlesMap = React.useMemo(() => {
        return initialArticles.reduce((acc, article) => {
            acc[article.id] = article;
            return acc;
        }, {} as Record<string, Article>);
    }, [initialArticles]);

    // Flatten all pages of article IDs
    const allArticleIds = data?.pages.flatMap(page => page.articles) || [];

    return (
        <div className="space-y-4">
            {allArticleIds.map(id => {
                const article = articlesById[id] || initialArticlesMap[id];
                if (!article) return null;
                return <StreamArticleListItem key={id} articleId={id} initialArticle={article} />;
            })}

            {hasNextPage && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isFetchingNextPage ? '加载中...' : '加载更多'}
                    </button>
                </div>
            )}
        </div>
    );
}
