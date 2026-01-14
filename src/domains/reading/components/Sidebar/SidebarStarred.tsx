import React from 'react';
import Link from 'next/link';
import { Article, Filter } from '@/types';
import { toShortId } from '@/shared/utils/idHelpers';

interface SidebarStarredProps {
  isExpanded: boolean;
  onToggle: () => void;
  isLoading: boolean;
  articles: Article[];
  onArticleClick: (article: Article) => void;
  starredCount: number;
  activeFilter: Filter | null;
  selectedArticleId: string | number | null;
  onSelect?: () => void;
}

const SidebarStarred: React.FC<SidebarStarredProps> = ({
  isExpanded,
  onToggle,
  isLoading,
  articles,
  onArticleClick,
  starredCount,
  activeFilter: _activeFilter,
  selectedArticleId,
  onSelect,
}) => {
  // const isFilterActive = activeFilter?.type === 'starred';
  const listItemButtonClass = (isActive: boolean) =>
    `w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-3 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-midnight-text-secondary dark:hover:bg-midnight-card dark:hover:text-gray-200'} cursor-pointer`;

  return (
    <nav className="flex flex-col">
      <button
        onClick={() => {
          onToggle();
          onSelect?.();
        }}
        className="mb-1 flex w-full cursor-pointer items-center justify-between px-2 py-1 text-left text-base font-bold text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <div className="flex items-center gap-2">
          <span>⭐ 我的收藏</span>
        </div>
        <div className="flex items-center gap-2">
          {starredCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {starredCount}
            </span>
          )}
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
      <div
        className={`ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800 ${isExpanded ? 'block' : 'hidden'}`}
      >
        {isLoading && articles.length === 0 ? (
          <div className="space-y-2 px-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="dark:bg-midnight-card h-8 animate-pulse rounded-sm bg-gray-100"
              ></div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="px-2 py-2 text-xs text-gray-400 italic">No favorites yet</div>
        ) : (
          articles.map((article) => (
            <Link
              prefetch={false}
              key={article.id}
              href={`/article/${toShortId(String(article.id))}?view=page`}
              onClick={(_e) => {
                // Optional: update store but let Link handle nav
                onArticleClick(article);
              }}
              className={listItemButtonClass(selectedArticleId === article.id)}
            >
              <span className="truncate">{article.title}</span>
            </Link>
          ))
        )}
      </div>
    </nav>
  );
};

export default SidebarStarred;
