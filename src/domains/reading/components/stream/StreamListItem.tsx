import React, { memo } from 'react';
import { getDisplayLabel } from '@/domains/reading/utils/label-display';
import { getSlugLink } from '@/domains/reading/utils/slug-helper';
import Link from 'next/link';
import { Article } from '@/types';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useArticleMetadata } from '@/domains/reading/hooks/useArticleMetadata';
import { getRandomColorClass } from '@/shared/utils/colorUtils';
import ArticleTitleStar from '../article/ArticleTitleStar';
import { useUIStore } from '@/shared/store/uiStore';
import { toShortId } from '@/shared/utils/idHelpers';
import { Dictionary, zh } from '@/app/i18n/dictionaries';

interface StreamArticleListItemProps {
  articleId: string | number;
  initialArticle?: Article; // Fallback if not in store
  dict?: Dictionary;
}

const StreamArticleListItem: React.FC<StreamArticleListItemProps> = memo(
  ({ articleId, initialArticle, dict = zh }) => {
    // 1. Hook Pre-computations (Always called)
    const storeArticle = useArticleStore((state) => state.articlesById[articleId]);
    const article = storeArticle || initialArticle;
    const openModal = useUIStore((state) => state.openModal);

    // Call hook unconditionally
    const { userTagLabels: displayedUserTags } = useArticleMetadata(article || ({} as Article));

    // 2. Conditional Return
    if (!article) return null;

    // 3. Render
    return (
      <div className="group relative flex cursor-pointer flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition-all duration-300 will-change-transform backface-hidden hover:-translate-y-1 hover:shadow-lg md:flex-row dark:bg-white/40 dark:ring-white/50 dark:backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-stone-50/50 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:to-white/5" />

        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="mb-2 flex items-start justify-between gap-4">
              <h3 className="dark:text-midnight-text-primary font-serif text-xl leading-tight font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                <ArticleTitleStar
                  article={article}
                  className="relative z-20 mr-1.5 inline-block size-5 -translate-y-[2px] align-middle"
                />
                <Link
                  href={`/article/${toShortId(String(article.id))}`}
                  prefetch={false}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    openModal(article.id);
                  }}
                >
                  <span className="absolute inset-0 z-0" aria-hidden="true" />
                  <span>{article.title}</span>
                </Link>
              </h3>
            </div>

            <div className="mb-4 flex items-center gap-3 text-xs font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
              <span className="text-gray-600 dark:text-stone-600">
                {getDisplayLabel(article.sourceName, 'feed', dict.lang === 'zh' ? 'zh' : 'en')}
              </span>
              <span className="size-1 rounded-full bg-gray-300 dark:bg-stone-400" />
              <span>
                {new Date(article.published).toLocaleDateString(
                  dict.lang === 'zh' ? 'zh-CN' : 'en-US',
                )}
              </span>
            </div>

            {displayedUserTags.length > 0 && (
              <div className="relative z-20 flex flex-wrap gap-2">
                {displayedUserTags.map(
                  (tagLabel) =>
                    tagLabel && (
                      <span
                        key={tagLabel}
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRandomColorClass(tagLabel)}`}
                      >
                        <Link
                          href={getSlugLink(
                            `user/-/label/${tagLabel}`,
                            dict.lang === 'zh' ? 'zh' : 'en',
                            'tag',
                          )}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()} // Prevent card click
                        >
                          #{getDisplayLabel(tagLabel, 'tag', dict.lang === 'zh' ? 'zh' : 'en')}
                        </Link>
                      </span>
                    ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 flex-col justify-center border-t border-stone-100 pt-4 md:w-1/3 md:border-t-0 md:border-l md:border-stone-100 md:pt-0 md:pl-6 dark:border-white/10">
          <p className="line-clamp-4 text-sm leading-relaxed font-medium text-stone-600 opacity-80 transition-opacity group-hover:opacity-100 dark:text-stone-600">
            {article.tldr || article.summary || (
              <span className="text-stone-500 italic dark:text-stone-400">
                {dict.sources.noBriefingTip}
              </span>
            )}
          </p>
          <div className="mt-4 flex justify-end">
            <svg
              className="size-5 text-stone-300 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
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
  },
);

StreamArticleListItem.displayName = 'StreamArticleListItem';

export default StreamArticleListItem;
