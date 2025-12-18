import React, { memo } from 'react';
import Link from 'next/link';
import { Article } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';
import { useArticleMetadata } from '../../../hooks/useArticleMetadata';
import { getRandomColorClass } from '../../../utils/colorUtils';
import ArticleTitleStar from '../article/ArticleTitleStar';
import { useUIStore } from '../../../store/uiStore';

interface StreamArticleListItemProps {
  articleId: string | number;
  initialArticle?: Article; // Fallback if not in store
}

const StreamArticleListItem: React.FC<StreamArticleListItemProps> = memo(
  ({ articleId, initialArticle }) => {
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
      <Link
        href={`/article/${article.id}`}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          openModal(article.id);
        }}
        className="group relative block cursor-pointer overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 will-change-transform backface-hidden hover:-translate-y-1 hover:shadow-lg dark:bg-white/40 dark:ring-white/50 dark:backdrop-blur-md"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-stone-50/50 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:to-white/5" />

        <div className="relative z-10">
          <div className="mb-2 flex items-start justify-between gap-4">
            <h3 className="dark:text-midnight-text-primary font-serif text-xl leading-tight font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
              <ArticleTitleStar
                article={article}
                className="mr-1.5 inline-block size-5 -translate-y-[2px] align-middle"
              />
              <span>{article.title}</span>
            </h3>
          </div>

          <div className="mb-4 flex items-center gap-3 text-xs font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
            <span className="text-gray-600 dark:text-stone-600">{article.sourceName}</span>
            <span className="size-1 rounded-full bg-gray-300 dark:bg-stone-400" />
            <span>{new Date(article.published).toLocaleDateString('zh-CN')}</span>
          </div>

          {displayedUserTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {displayedUserTags.map(
                (tagLabel) =>
                  tagLabel && (
                    <span
                      key={tagLabel}
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRandomColorClass(tagLabel)}`}
                    >
                      #{tagLabel}
                    </span>
                  ),
              )}
            </div>
          )}
        </div>
      </Link>
    );
  },
);

StreamArticleListItem.displayName = 'StreamArticleListItem';

export default StreamArticleListItem;
