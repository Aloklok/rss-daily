import React, { memo, useMemo } from 'react';
import { Article } from '../types';
import { useUIStore } from '../store/uiStore';
import { useArticleStore } from '../store/articleStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import ArticleTitleStar from '../app/components/ArticleTitleStar';
import { getRandomColorClass } from '../utils/colorUtils';

interface ArticleListProps {
  articleIds: (string | number)[];
  onOpenArticle?: (article: Article) => void;
  isLoading: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

// Internal customized card for SearchList only
const SearchListItem: React.FC<{ articleId: string | number }> = ({ articleId }) => {
  const openModal = useUIStore(state => state.openModal);
  const article = useArticleStore(state => state.articlesById[articleId]);

  const { userTagLabels } = useArticleMetadata(article);

  if (!article) return null;

  return (
    <div
      onClick={() => openModal(article.id)}
      className="group relative flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-white dark:bg-white/40 dark:backdrop-blur-md ring-1 ring-stone-200 dark:ring-white/50 hover:ring-2 hover:ring-black dark:hover:ring-white/70 transition-all cursor-pointer shadow-sm hover:shadow-xl"
    >
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-medium text-stone-900 dark:text-stone-900 mb-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-600 transition-colors">
            <ArticleTitleStar article={article} className="size-5 inline-block mr-2 -mt-1 text-amber-400" />
            {article.title}
          </h3>

          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
            <span className="text-stone-700 dark:text-stone-600">{article.sourceName}</span>
            <span className="size-1 rounded-full bg-stone-300"></span>
            <span>{new Date(article.published).toLocaleDateString('zh-CN')}</span>
          </div>

          {userTagLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userTagLabels.map(tag => (
                <span key={tag} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRandomColorClass(tag)}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Summary (Vertical Centered) */}
      <div className="md:w-1/3 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-stone-300 dark:border-white/20 pt-4 md:pt-0 md:pl-6">
        <p className="text-sm font-medium text-stone-600 dark:text-stone-600 leading-relaxed line-clamp-4 opacity-80 group-hover:opacity-100 transition-opacity">
          {article.tldr || article.summary}
        </p>
        <div className="mt-4 flex justify-end">
          <svg className="size-5 text-stone-300 group-hover:text-black dark:group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const SearchList: React.FC<ArticleListProps> = ({
  articleIds,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}) => {
  const activeFilter = useUIStore((state) => state.activeFilter);

  const filterLabel = useMemo(() => {
    if (!activeFilter) return '搜索结果';
    if (activeFilter.type === 'search') return `"${decodeURIComponent(activeFilter.value)}"`;
    const parts = activeFilter.value.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  }, [activeFilter]);

  if (isLoading) return <div className="py-20 text-center">Loading...</div>;

  if (articleIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-400">
        <div className="text-6xl mb-4 grayscale">📂</div>
        <p className="font-serif text-xl">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
      {/* Editorial Header */}
      <div className="mb-16">
        <h2 className="text-5xl md:text-7xl font-serif font-black text-stone-900 dark:text-stone-900 mb-4 tracking-tight">
          {filterLabel}
        </h2>
        <div className="h-2 w-24 bg-blue-600 dark:bg-blue-400 mb-6"></div>
        <p className="text-stone-500 font-medium uppercase tracking-widest text-sm">
          Found {articleIds.length} Articles
        </p>
      </div>

      <div className="space-y-8">
        {articleIds.map((id) => (
          <SearchListItem key={id} articleId={id} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-20 text-center">
          <button
            onClick={() => fetchNextPage?.()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-3 px-8 py-4 bg-stone-100 dark:bg-stone-800 rounded-full font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'View More Archives'}
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(SearchList);
