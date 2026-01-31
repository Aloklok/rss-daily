'use client';

import React, { useEffect } from 'react';
import { useFilteredArticles } from '@/domains/reading/hooks/useArticles';
import StreamArticleListItem from './StreamListItem';
import { useArticleStore } from '@/domains/article/store/articleStore';
import { Article } from '@/types';
import { Dictionary, zh } from '@/app/i18n/dictionaries';

interface StreamListProps {
  filterValue: string;
  initialArticles: Article[];
  initialContinuation?: string;
  dict?: Dictionary;
  tableName?: string;
  merge?: boolean;
}

export default function StreamList({
  filterValue,
  initialArticles,
  initialContinuation,
  dict = zh,
  tableName = 'articles_view',
  merge = false,
}: StreamListProps) {
  // Construct initialData for useInfiniteQuery
  const initialData = {
    pages: [
      {
        articles: initialArticles.map((a) => a.id),
        continuation: initialContinuation,
      },
    ],
    pageParams: [undefined],
  };

  // Pre-populate store with initial articles
  // We need to do this because useFilteredArticles only adds to store in queryFn,
  // but initialData skips the first queryFn call.
  const addArticles = useArticleStore((state) => state.addArticles);
  useEffect(() => {
    addArticles(initialArticles);
  }, [initialArticles, addArticles]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFilteredArticles(
    filterValue,
    initialData,
    merge,
    tableName,
  );

  // const articlesById = useArticleStore((state) => state.articlesById); <--- REMOVED dependency

  // Memoize initial articles map for SSR fallback
  const initialArticlesMap = React.useMemo(() => {
    return initialArticles.reduce(
      (acc, article) => {
        acc[article.id] = article;
        return acc;
      },
      {} as Record<string, Article>,
    );
  }, [initialArticles]);

  // Flatten all pages of article IDs
  const allArticleIds = data?.pages.flatMap((page) => page.articles) || [];

  return (
    <div className="space-y-4">
      {allArticleIds.map((id) => {
        // Pass ONLY initial SSR data.
        // Logic: StreamListItem handles store lookup.
        // If store has update, it uses store. If not (SSR), it uses this initialArticle.
        return (
          <StreamArticleListItem
            key={id}
            articleId={id}
            initialArticle={initialArticlesMap[id]}
            dict={dict}
          />
        );
      })}

      {hasNextPage && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="cursor-pointer rounded-full bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <span className="cursor-pointer">
              {isFetchingNextPage ? dict.stream.loading : dict.stream.loadMore}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
