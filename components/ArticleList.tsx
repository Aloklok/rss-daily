// components/ArticleList.tsx

import React, { memo, useMemo } from 'react';
import { Article, Filter, Tag } from '../types';
import { useArticleStore } from '../store/articleStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';

interface ArticleListProps {
  articleIds: (string | number)[];
  onOpenArticle: (article: Article) => void;
  isLoading: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const GRADIENTS = [
  'from-rose-400 via-fuchsia-500 to-indigo-500', 'from-green-400 via-cyan-500 to-blue-500',
  'from-amber-400 via-orange-500 to-red-500', 'from-teal-400 via-sky-500 to-purple-500',
  'from-lime-400 via-emerald-500 to-cyan-500'
];

const ArticleListItem: React.FC<{ articleId: string | number; onOpenArticle: (article: Article) => void }> = memo(({ articleId, onOpenArticle }) => {
  const article = useArticleStore(state => state.articlesById[articleId]);

  if (!article) return null;

  const { isStarred, userTagLabels: displayedUserTags } = useArticleMetadata(article);

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onOpenArticle(article)}
    >
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-x-2">
        {isStarred && <span className="text-amber-400 text-xl" title="已收藏">⭐️</span>}
        <span>{article.title}</span>
      </h3>
      <p className="text-sm text-gray-600">来源: {article.sourceName}</p>
      <p className="text-xs text-gray-500">发布日期: {new Date(article.published).toLocaleDateString()}</p>
      {displayedUserTags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {displayedUserTags.map(tagLabel => (tagLabel && <span key={tagLabel} className={`text-xs font-semibold inline-block py-1 px-2.5 rounded-full ${getRandomColorClass(tagLabel)}`}>{tagLabel}</span>))}
        </div>
      )}
    </div>
  );
});
ArticleListItem.displayName = 'ArticleListItem';

const ArticleList: React.FC<ArticleListProps> = ({
  articleIds,
  onOpenArticle,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}) => {
  const activeFilter = useArticleStore((state) => state.activeFilter);

  const randomGradient = useMemo(() => {
    if (!activeFilter) return GRADIENTS[0];
    const hash = activeFilter.value.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  }, [activeFilter]);

  const filterLabel = useMemo(() => {
    if (!activeFilter) return '文章';
    const parts = activeFilter.value.split('/');
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart);
  }, [activeFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (articleIds.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>没有找到文章。</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <header className={`relative mb-6 md:mb-12 bg-gradient-to-br ${randomGradient} rounded-2xl p-4 md:p-8 text-white shadow-lg`}>
        <h1 className="text-4xl md:text-5xl font-serif font-bold leading-none tracking-tight">
          {filterLabel}
        </h1>
      </header>
      <div className="space-y-0.5">
        {articleIds.map((id) => (
          <ArticleListItem key={id} articleId={id} onOpenArticle={onOpenArticle} />
        ))}
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchNextPage?.()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isFetchingNextPage ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(ArticleList);