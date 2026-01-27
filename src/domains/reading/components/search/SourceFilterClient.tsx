'use client';

import React, { useCallback, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadMoreButton from '@/shared/ui/LoadMoreButton';
import { useFilteredArticles } from '@/domains/reading/hooks/useArticles';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useUIStore } from '@/shared/store/uiStore';
import { useArticleMetadata } from '@/domains/reading/hooks/useArticleMetadata';
import ArticleTitleStar from '../article/ArticleTitleStar';
import { getRandomColorClass } from '@/shared/utils/colorUtils';
import { getDisplayLabel, normalizeLabel, sortLabels } from '@/domains/reading/utils/label-display';
import { Dictionary } from '@/app/i18n/dictionaries';
import { UNCATEGORIZED_LABEL } from '@/domains/reading/constants';

interface Subscription {
  id: string;
  title: string;
  category?: string;
}

interface SourceFilterClientProps {
  subscriptions: Subscription[];
  dict: Dictionary;
  tableName?: string;
}

// ... (existing code)

// Custom Card with Summary on Right (matching SearchListItem style)
const SourceListItem: React.FC<{ articleId: string | number; dict: Dictionary }> = ({
  articleId,
  dict,
}) => {
  const openModal = useUIStore((state) => state.openModal);
  const article = useArticleStore((state) => state.articlesById[articleId]);
  const { userTagLabels } = useArticleMetadata(article);

  if (!article) return null;

  const sourceName = getDisplayLabel(article.sourceName, 'feed', dict.lang === 'zh' ? 'zh' : 'en');
  const hasSummary = !!(article.tldr || article.summary);

  const handleClick = () => {
    openModal(article.id, hasSummary ? 'briefing' : 'reader');
  };

  return (
    <div
      onClick={handleClick}
      className="group dark:border-midnight-border dark:bg-midnight-card dark:ring-midnight-border/50 dark:hover:bg-midnight-card/80 dark:hover:ring-midnight-border relative flex cursor-pointer flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition-all hover:bg-stone-50 hover:shadow-xl hover:ring-2 hover:ring-black md:flex-row dark:border"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="mb-2 text-xl leading-tight font-medium text-stone-900 transition-colors group-hover:text-blue-600 dark:text-stone-100 dark:group-hover:text-blue-400">
            <ArticleTitleStar
              article={article}
              className="-mt-1 mr-2 inline-block size-5 align-middle text-amber-400"
            />
            {article.title}
          </h3>

          <div className="mb-4 flex items-center gap-3 text-xs font-bold tracking-wider text-stone-500 uppercase">
            <span className="text-stone-700 dark:text-stone-400">{sourceName}</span>
            <span className="size-1 rounded-full bg-stone-300 dark:bg-stone-600"></span>
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
                  {getDisplayLabel(tag, 'tag', dict.lang === 'zh' ? 'zh' : 'en')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Summary (Vertical Centered) */}
      <div className="dark:border-midnight-border flex shrink-0 flex-col justify-center border-t border-stone-300 pt-4 md:w-1/3 md:border-t-0 md:border-l md:pt-0 md:pl-6">
        <p className="line-clamp-4 text-sm leading-relaxed font-medium text-stone-600 opacity-80 transition-opacity group-hover:opacity-100 dark:text-stone-400">
          {article.tldr || article.summary || (
            <span className="italic opacity-50">{dict.sources.noBriefingTip}</span>
          )}
        </p>
        <div className="mt-4 flex justify-end">
          <svg
            className="size-5 text-stone-300 transition-colors group-hover:text-black dark:text-stone-600 dark:group-hover:text-stone-200"
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

export default function SourceFilterClient({
  subscriptions,
  dict,
  tableName = 'articles_view',
}: SourceFilterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get('source');
  const [isPending, startTransition] = useTransition();

  // ... (useFilteredArticles logic unchanged)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFilteredArticles(
    sourceId,
    undefined,
    true,
    tableName,
  );

  const articleIds = data?.pages.flatMap((page) => page.articles) || [];

  // Group subscriptions by category
  const groupedSubscriptions = React.useMemo(() => {
    const groups: Record<string, Subscription[]> = {};
    subscriptions.forEach((sub) => {
      // Normalize category label first
      const cat = normalizeLabel(sub.category || UNCATEGORIZED_LABEL);
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(sub);
    });
    return groups;
  }, [subscriptions]);

  const sortedCategories = React.useMemo(() => {
    return sortLabels(Object.keys(groupedSubscriptions));
  }, [groupedSubscriptions]);

  // Effect to scroll to top when source changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sourceId]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSource = e.target.value;
      const basePath = dict.lang === 'zh' ? '' : '/en';
      startTransition(() => {
        if (newSource) {
          router.push(`${basePath}/sources?source=${encodeURIComponent(newSource)}`);
        } else {
          router.push(`${basePath}/sources`);
        }
      });
    },
    [router, dict.lang],
  );

  return (
    <div className="min-h-screen transition-colors duration-500">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        {/* Header Section */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900 md:text-4xl">
              {dict.sources.title}
            </h1>
            <p className="mt-2 text-sm text-stone-500">{dict.sources.subtitle}</p>
          </div>

          {/* Source Selector */}
          <div className="w-full md:w-72">
            <label htmlFor="source-select" className="sr-only">
              {dict.sources.selectLabel}
            </label>
            <div className="relative">
              <select
                id="source-select"
                value={sourceId || ''}
                onChange={handleSourceChange}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 py-3 pr-10 text-stone-700 shadow-sm transition-all hover:border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                disabled={isPending}
              >
                <option value="">{dict.sources.placeholder}</option>
                {sortedCategories.map((category) => (
                  <optgroup
                    key={category}
                    label={getDisplayLabel(category, 'category', dict.lang as 'zh' | 'en')}
                  >
                    {groupedSubscriptions[category].map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {getDisplayLabel(sub.title, 'feed', dict.lang as 'zh' | 'en')}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative min-h-[500px]">
          {sourceId ? (
            <>
              {articleIds.length > 0 ? (
                <div className="space-y-4">
                  {articleIds.map((id) => (
                    <SourceListItem key={id} articleId={id} dict={dict} />
                  ))}

                  {/* Load More Trigger */}
                  {hasNextPage && (
                    <div className="flex justify-center pt-8 pb-12">
                      <LoadMoreButton
                        onClick={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                        label={dict.sources.loadMore}
                        className="rounded-full bg-white/50 px-8 py-3 font-medium text-stone-600 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 hover:shadow-md active:scale-95 disabled:opacity-50 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-stone-800/80"
                      />
                    </div>
                  )}
                </div>
              ) : (
                !isLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <p>{dict.sources.noArticles}</p>
                  </div>
                )
              )}

              {isLoading && !data && (
                <div className="py-20 text-center">
                  <div className="inline-block size-8 animate-spin rounded-full border-4 border-stone-200 border-t-blue-500"></div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200/50 text-center dark:border-stone-800/50">
              <div className="mb-4 text-5xl opacity-50 grayscale">📡</div>
              <h3 className="text-lg font-medium text-stone-900">{dict.sources.emptyTip}</h3>
            </div>
          )}
        </div>
      </div>

      {/* Modal for viewing articles is handled globally by GlobalUI */}
    </div>
  );
}
