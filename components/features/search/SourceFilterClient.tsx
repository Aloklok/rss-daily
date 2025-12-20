'use client';

import React, { useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadMoreButton from '../../common/ui/LoadMoreButton';
import { useFilteredArticles } from '../../../hooks/useArticles'; // Assuming we re-use or adapt this hook
// import ArticleModal from '../../common/ui/ArticleModal'; // Removing incorrect import
import { useArticleStore } from '../../../store/articleStore';
import { useUIStore } from '../../../store/uiStore';
import { useArticleMetadata } from '../../../hooks/useArticleMetadata';
import ArticleTitleStar from '../article/ArticleTitleStar';
import { getRandomColorClass } from '../../../utils/colorUtils';

interface Subscription {
  id: string;
  title: string;
  category?: string;
}

interface SourceFilterClientProps {
  subscriptions: Subscription[];
}

// Custom Card with Summary on Right (matching SearchListItem style)
const SourceListItem: React.FC<{ articleId: string | number }> = ({ articleId }) => {
  const openModal = useUIStore((state) => state.openModal);
  const article = useArticleStore((state) => state.articlesById[articleId]);
  const { userTagLabels } = useArticleMetadata(article);

  if (!article) return null;

  const hasSummary = !!(article.tldr || article.summary);

  const handleClick = () => {
    openModal(article.id, hasSummary ? 'briefing' : 'reader');
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex cursor-pointer flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition-all hover:bg-stone-50 hover:shadow-xl hover:ring-2 hover:ring-black md:flex-row dark:border dark:border-white/10 dark:bg-white/40 dark:ring-white/10 dark:backdrop-blur-md dark:hover:bg-white/60 dark:hover:ring-white/30"
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
            <span className="text-stone-700 dark:text-stone-400">{article.sourceName}</span>
            <span className="size-1 rounded-full bg-stone-300 dark:bg-stone-600"></span>
            <span>{new Date(article.published).toLocaleDateString('zh-CN')}</span>
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
      <div className="flex shrink-0 flex-col justify-center border-t border-stone-300 pt-4 md:w-1/3 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-white/10">
        <p className="line-clamp-4 text-sm leading-relaxed font-medium text-stone-600 opacity-80 transition-opacity group-hover:opacity-100 dark:text-stone-400">
          {article.tldr || article.summary || (
            <span className="italic opacity-50">暂无简报，点击阅读原文</span>
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

export default function SourceFilterClient({ subscriptions }: SourceFilterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get('source');
  const [isPending, startTransition] = useTransition();

  // Use the existing hook to fetch articles based on the source ID (which is treated as a stream ID)
  // useFilteredArticles logic in `hooks/useArticles.ts` connects to `fetchFilteredArticles`
  // which uses `getArticlesByLabel` (supports arbitrary stream IDs).
  // This aligns with "StreamList-like" behavior.
  // merge=true ensures we get Supabase data (summaries) joined in.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFilteredArticles(
    sourceId,
    undefined,
    true,
  );

  // Flatten the infinite query data
  const articleIds = data?.pages.flatMap((page) => page.articles) || [];

  // Group subscriptions by category
  const groupedSubscriptions = React.useMemo(() => {
    const groups: Record<string, Subscription[]> = {};
    subscriptions.forEach((sub) => {
      const cat = sub.category || '未分类';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(sub);
    });
    return groups;
  }, [subscriptions]);

  const sortedCategories = React.useMemo(() => {
    const categories = Object.keys(groupedSubscriptions);
    // console.log('SourceFilterClient: Available Categories:', categories);

    const ORDER = [
      '前端',
      'AI',
      '工程',
      '架构',
      '基础设施',
      '图', // Image
      '播客', // Podcast
    ];

    const getOrderIndex = (name: string) => {
      const lowerName = name.toLowerCase();
      // Find the index of the first keyword that appears in the category name
      return ORDER.findIndex((keyword) => lowerName.includes(keyword.toLowerCase()));
    };

    return categories
      .filter((cat) => cat !== '未分类')
      .sort((a, b) => {
        const indexA = getOrderIndex(a);
        const indexB = getOrderIndex(b);

        // If both are in the matched list, sort by the predefined order
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        // Matched categories come before unmatched ones
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // If neither matches, sort alphabetically
        return a.localeCompare(b, 'zh-Hans-CN');
      });
  }, [groupedSubscriptions]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSource = e.target.value;
      startTransition(() => {
        if (newSource) {
          router.push(`/sources?source=${encodeURIComponent(newSource)}`);
        } else {
          router.push('/sources');
        }
      });
    },
    [router],
  );

  return (
    <div className="min-h-screen transition-colors duration-500">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        {/* Header Section */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900 md:text-4xl dark:text-stone-100">
              按订阅源浏览
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              From RSS subscriptions
            </p>
          </div>

          {/* Source Selector */}
          <div className="w-full md:w-72">
            <label htmlFor="source-select" className="sr-only">
              选择订阅源
            </label>
            <div className="relative">
              <select
                id="source-select"
                value={sourceId || ''}
                onChange={handleSourceChange}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 py-3 pr-10 text-stone-700 shadow-sm transition-all hover:border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                disabled={isPending}
              >
                <option value="">-- 选择一个订阅源 --</option>
                {sortedCategories.map((category) => (
                  <optgroup key={category} label={category}>
                    {groupedSubscriptions[category].map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.title}
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
                    <SourceListItem key={id} articleId={id} />
                  ))}

                  {/* Load More Trigger */}
                  {hasNextPage && (
                    <div className="flex justify-center pt-8 pb-12">
                      <LoadMoreButton
                        onClick={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                        label="加载更多文章"
                        className="rounded-full bg-white/50 px-8 py-3 font-medium text-stone-600 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 hover:shadow-md active:scale-95 disabled:opacity-50 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-stone-800/80"
                      />
                    </div>
                  )}
                </div>
              ) : (
                !isLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <p>暂无文章</p>
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
              <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">
                请点击下拉框选择订阅源
              </h3>
            </div>
          )}
        </div>
      </div>

      {/* Modal for viewing articles is handled globally by GlobalUI */}
    </div>
  );
}
