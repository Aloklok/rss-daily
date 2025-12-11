// components/ArticleList.tsx

import React, { memo, useMemo } from 'react';
import { Article, Filter, Tag } from '../types';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';
import ArticleTitleStar from '../app/components/ArticleTitleStar';
import StreamArticleListItem from './StreamArticleListItem';

import ArticleListHeader from './ArticleListHeader';

interface ArticleListProps {
  articleIds: (string | number)[];
  onOpenArticle?: (article: Article) => void;
  isLoading: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({
  articleIds,
  onOpenArticle, // kept for compatibility but unused
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}) => {
  const activeFilter = useUIStore((state) => state.activeFilter);

  // Filter label logic remains...
  const filterLabel = useMemo(() => {
    if (!activeFilter) return '文章';
    const parts = activeFilter.value.split('/');
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart);
  }, [activeFilter]);

  if (isLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (articleIds.length === 0) {
    return <div className="p-8 text-center text-gray-500">暂无文章</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <ArticleListHeader title={filterLabel} count={articleIds.length} />

      <div className="space-y-4">
        {articleIds.map((id) => (
          <StreamArticleListItem key={id} articleId={id} />
        ))}
      </div>
// ... load more ...

      {/* Load More Button */}
      {hasNextPage && (
        <div className="mt-12 flex justify-center pb-8">
          <button
            onClick={() => fetchNextPage?.()}
            disabled={isFetchingNextPage}
            className="group relative px-8 py-3 bg-white dark:bg-midnight-card border border-stone-200 dark:border-midnight-border rounded-full text-stone-600 dark:text-stone-300 font-medium hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <span className="flex items-center gap-2">
              {isFetchingNextPage ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>加载中...</span>
                </>
              ) : (
                <>
                  <span>加载更多</span>
                  <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(ArticleList);