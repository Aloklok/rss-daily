// components/ArticleList.tsx

import React, { memo, useMemo } from 'react';
import { Article, Filter, Tag } from '../types';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';
import ArticleTitleStar from '../app/components/ArticleTitleStar';

interface ArticleListProps {
  articleIds: (string | number)[];
  onOpenArticle: (article: Article) => void;
  isLoading: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const GRADIENTS = [
  'from-rose-100 via-rose-200 to-orange-100 dark:from-rose-900/40 dark:via-fuchsia-900/40 dark:to-indigo-900/40',
  'from-emerald-100 via-teal-200 to-cyan-100 dark:from-emerald-900/40 dark:via-teal-900/40 dark:to-cyan-900/40',
  'from-amber-100 via-orange-200 to-yellow-100 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-red-900/40',
  'from-sky-100 via-indigo-200 to-blue-100 dark:from-sky-900/40 dark:via-indigo-900/40 dark:to-blue-900/40',
  'from-fuchsia-100 via-purple-200 to-pink-100 dark:from-fuchsia-900/40 dark:via-purple-900/40 dark:to-pink-900/40'
];

const ArticleListItem: React.FC<{ articleId: string | number; onOpenArticle: (article: Article) => void }> = memo(({ articleId, onOpenArticle }) => {
  const article = useArticleStore(state => state.articlesById[articleId]);

  if (!article) return null;

  const { userTagLabels: displayedUserTags } = useArticleMetadata(article); // isStarred is now handled by ArticleTitleStar

  return (
    <div
      className="group relative bg-white border border-stone-100 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden"
      onClick={() => onOpenArticle(article)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-stone-50/50 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-midnight-text-primary leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {/* Star placed inline at the start of the title text. Reverting to -translate-y-[2px] which was previously verified. */}
            <ArticleTitleStar article={article} className="w-5 h-5 mr-1.5 inline-block align-middle -translate-y-[2px]" />
            <span>{article.title}</span>
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
          <span className="text-gray-600 dark:text-midnight-text-secondary">{article.sourceName}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>{new Date(article.published).toLocaleDateString()}</span>
        </div>

        {displayedUserTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayedUserTags.map(tagLabel => (
              tagLabel && (
                <span
                  key={tagLabel}
                  className={`text-xs font-semibold inline-block py-1 px-3 rounded-full ${getRandomColorClass(tagLabel)}`}
                >
                  #{tagLabel}
                </span>
              )
            ))}
          </div>
        )}
      </div>
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
  const activeFilter = useUIStore((state) => state.activeFilter);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-200 dark:border-stone-700 border-l-stone-500"></div>
      </div>
    );
  }

  if (articleIds.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 mb-4">
          <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <p className="text-lg text-stone-500 dark:text-stone-400 font-medium">没有找到相关文章</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <header className={`relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br ${randomGradient} shadow-sm`}>
        <div className="absolute inset-0 bg-[url('/paper-texture.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
            {filterLabel}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium opacity-80">
            <span className="uppercase tracking-widest text-xs">Collection</span>
            <span className="w-8 h-px bg-current opacity-50"></span>
            <span className="text-sm">{articleIds.length} Articles</span>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {articleIds.map((id) => (
          <ArticleListItem key={id} articleId={id} onOpenArticle={onOpenArticle} />
        ))}
      </div>

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