'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import TagPopover from '../common/ui/TagPopover';
import { useArticleMetadata } from '../../hooks/useArticleMetadata';
import { useArticleStore } from '../../store/articleStore';
import { useUIStore } from '../../store/uiStore';
import { useArticleActions } from '../../hooks/useArticleActions';
import {
  useBriefingArticles,
  useFilteredArticles,
  useSearchResults,
} from '../../hooks/useArticles';
import { useFilters } from '../../hooks/useFilters';
import { getCurrentTimeSlotInShanghai } from '../../services/api';
import { READ_TAG, STAR_TAG } from '../../constants';

interface FloatingActionButtonsProps {
  isAdmin: boolean;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({ isAdmin }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  // Store State
  const activeFilter = useUIStore((state) => state.activeFilter);
  const selectedArticleId = useUIStore((state) => state.selectedArticleId);
  const setSelectedArticleId = useUIStore((state) => state.setSelectedArticleId);
  const setTimeSlot = useUIStore((state) => state.setTimeSlot);
  const timeSlot = useUIStore((state) => state.timeSlot);
  const { handleResetFilter } = useFilters();

  // Actions
  const { handleArticleStateChange, handleMarkAllClick, isUpdatingArticle, isMarkingAsRead } =
    useArticleActions();

  // Data Fetching for articleIdsInView
  const { data: searchData } = useSearchResults(
    activeFilter?.type === 'search' ? activeFilter.value : null,
  );

  const { data: briefingArticleIds, isFetching: isBriefingFetching } = useBriefingArticles(
    activeFilter?.type === 'date' ? activeFilter.value : null,
    timeSlot,
  );

  const { data: filteredArticlesData } = useFilteredArticles(
    activeFilter?.type === 'category' || activeFilter?.type === 'tag' ? activeFilter.value : null,
  );

  const filteredArticleIds = useMemo(() => {
    return (
      filteredArticlesData?.pages.flatMap(
        (page: { articles: (string | number)[] }) => page.articles,
      ) || []
    );
  }, [filteredArticlesData]);

  const articleIdsInView = useMemo(() => {
    if (activeFilter?.type === 'date') {
      return briefingArticleIds || [];
    } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
      return filteredArticleIds || [];
    } else if (activeFilter?.type === 'search') {
      return searchData?.pages.flatMap((p: { articles: (string | number)[] }) => p.articles) || [];
    }
    return [];
  }, [activeFilter, briefingArticleIds, filteredArticleIds, searchData]);

  const handleRefreshToHome = async () => {
    setSelectedArticleId(null);
    setTimeSlot(getCurrentTimeSlotInShanghai());
    await queryClient.invalidateQueries({ queryKey: ['briefing'] });
    handleResetFilter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push('/');
  };

  // Internal Logic
  const selectedArticle = useArticleStore((state) =>
    selectedArticleId ? state.articlesById[selectedArticleId] : null,
  );

  const hasUnreadInView = useArticleStore((state) => {
    if (!articleIdsInView) return false;
    return articleIdsInView.some((id) => {
      const article = state.articlesById[id];
      return article && !article.tags?.includes(READ_TAG);
    });
  });

  const { isStarred } = useArticleMetadata(selectedArticle);

  return (
    <div className="fixed right-8 bottom-8 z-20 flex flex-col-reverse items-center gap-y-3">
      {/* --- 共享按钮：始终显示 --- */}
      <button
        onClick={handleRefreshToHome}
        disabled={isBriefingFetching}
        className="cursor-pointer rounded-full bg-gray-800 p-3 text-white shadow-lg transition-all hover:bg-gray-950"
        aria-label="Back to today's briefing"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 cursor-pointer"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>

      {/* --- 条件渲染块：根据是否有选中文章来显示不同的按钮 --- */}
      {isAdmin &&
        (selectedArticle ? (
          <>
            {/* 仅在有选中文章时显示：标签和收藏按钮 */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsTagPopoverOpen((prev) => !prev)}
                className="cursor-pointer rounded-full bg-sky-600 p-3 text-white shadow-lg transition-all hover:bg-sky-700"
                aria-label="Tag article"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 cursor-pointer"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isTagPopoverOpen && (
                <TagPopover
                  article={selectedArticle}
                  onClose={() => setIsTagPopoverOpen(false)}
                  onStateChange={handleArticleStateChange}
                />
              )}
            </div>
            <button
              onClick={() => {
                handleArticleStateChange(
                  selectedArticle.id,
                  isStarred ? [] : [STAR_TAG],
                  isStarred ? [STAR_TAG] : [],
                );
              }}
              disabled={isUpdatingArticle}
              className={`cursor-pointer rounded-full p-3 text-white shadow-lg transition-all disabled:bg-gray-500 ${
                isStarred ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-950'
              }`}
              aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isStarred ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 cursor-pointer"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              )}
            </button>
          </>
        ) : (
          <>
            {/* 仅在没有选中文章时显示：全部标记已读按钮 */}
            <button
              onClick={() => handleMarkAllClick(articleIdsInView)}
              disabled={isMarkingAsRead || !hasUnreadInView}
              className={`cursor-pointer rounded-full bg-gray-800 p-3 text-white shadow-lg transition-all hover:bg-gray-950 disabled:cursor-not-allowed disabled:bg-gray-500`}
              aria-label="Mark all as read"
            >
              {isMarkingAsRead ? (
                <svg
                  className="h-6 w-6 animate-spin cursor-pointer"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>
          </>
        ))}

      {/* --- 共享按钮：始终显示 --- */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="cursor-pointer rounded-full bg-gray-800 p-3 text-white shadow-lg transition-all hover:bg-gray-950"
        aria-label="Back to top"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 cursor-pointer"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M12 19V4" />
        </svg>
      </button>
    </div>
  );
};

export default FloatingActionButtons;
