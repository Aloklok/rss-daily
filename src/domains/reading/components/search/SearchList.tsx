import React, { memo, useMemo } from 'react';
import { Article } from '@/types';
import { useUIStore } from '@/shared/store/uiStore';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useArticleMetadata } from '@/domains/reading/hooks/useArticleMetadata';
import ArticleTitleStar from '../article/ArticleTitleStar';
import { getRandomColorClass } from '@/shared/utils/colorUtils';
import EmptyState from '@/shared/ui/EmptyState';
import LoadMoreButton from '@/shared/ui/LoadMoreButton';
import { Dictionary } from '@/app/i18n/dictionaries';

interface ArticleListProps {
  articleIds: (string | number)[];
  onOpenArticle?: (article: Article) => void;
  isLoading: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  dict: Dictionary;
}

// Internal customized card for SearchList only
const SearchListItem: React.FC<{ articleId: string | number; dict: Dictionary }> = ({
  articleId,
  dict,
}) => {
  const openModal = useUIStore((state) => state.openModal);
  const article = useArticleStore((state) => state.articlesById[articleId]);

  const { userTagLabels } = useArticleMetadata(article);

  if (!article) return null;

  return (
    <div
      onClick={() => openModal(article.id)}
      className="group relative flex cursor-pointer flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition-all hover:shadow-xl hover:ring-2 hover:ring-black md:flex-row dark:bg-white/40 dark:ring-white/50 dark:backdrop-blur-md dark:hover:ring-white/70"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="mb-2 text-xl leading-tight font-medium text-stone-900 transition-colors group-hover:text-blue-600 dark:text-stone-900 dark:group-hover:text-blue-600">
            <ArticleTitleStar
              article={article}
              className="-mt-1 mr-2 inline-block size-5 text-amber-400"
            />
            {article.title}
          </h3>

          <div className="mb-4 flex items-center gap-3 text-xs font-bold tracking-wider text-stone-500 uppercase">
            <span className="text-stone-700 dark:text-stone-600">{article.sourceName}</span>
            <span className="size-1 rounded-full bg-stone-300"></span>
            <span>
              {new Date(article.published).toLocaleDateString(
                dict.lang === 'zh' ? 'zh-CN' : 'en-US',
              )}
            </span>
          </div>

          {userTagLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userTagLabels.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getRandomColorClass(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Summary (Vertical Centered) */}
      <div className="flex shrink-0 flex-col justify-center border-t border-stone-300 pt-4 md:w-1/3 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-white/20">
        <p className="line-clamp-4 text-sm leading-relaxed font-medium text-stone-600 opacity-80 transition-opacity group-hover:opacity-100 dark:text-stone-600">
          {article.tldr || article.summary}
        </p>
        <div className="mt-4 flex justify-end">
          <svg
            className="size-5 text-stone-300 transition-colors group-hover:text-black dark:group-hover:text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const SearchList: React.FC<ArticleListProps> = ({
  articleIds,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  dict,
}) => {
  const activeFilter = useUIStore((state) => state.activeFilter);

  const filterLabel = useMemo(() => {
    if (!activeFilter) return dict.search.title;
    if (activeFilter.type === 'search') return `"${decodeURIComponent(activeFilter.value)}"`;
    const parts = activeFilter.value.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  }, [activeFilter]);

  if (isLoading) return <div className="py-20 text-center">{dict.common.loading}</div>;

  if (articleIds.length === 0) {
    return (
      <EmptyState
        icon={<div className="mb-4 text-6xl grayscale">📂</div>}
        message={dict.search.noData}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      {/* Editorial Header */}
      <div className="mb-16">
        <h2 className="mb-4 font-serif text-5xl font-black tracking-tight text-stone-900 md:text-7xl dark:text-stone-900">
          {filterLabel}
        </h2>
        <div className="mb-6 h-2 w-24 bg-blue-600 dark:bg-blue-400"></div>
        <p className="text-sm font-medium tracking-widest text-stone-500 uppercase">
          {dict.search.found.replace('{count}', String(articleIds.length))}
        </p>
      </div>

      <div className="space-y-8">
        {articleIds.map((id) => (
          <SearchListItem key={id} articleId={id} dict={dict} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-20 text-center">
          <LoadMoreButton
            onClick={() => fetchNextPage?.()}
            isLoading={isFetchingNextPage || false}
            label={dict.search.loadMore}
            className="rounded-full bg-stone-100 px-8 py-4 font-bold transition-colors hover:bg-stone-200 disabled:opacity-50 dark:bg-stone-800 dark:hover:bg-stone-700"
          />
        </div>
      )}
    </div>
  );
};

export default memo(SearchList);
