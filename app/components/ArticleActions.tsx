'use client';

import React, { useState, memo } from 'react';
import Link from 'next/link';
import { Article } from '../../types';
import { useArticleMetadata } from '../../hooks/useArticleMetadata';
import { useUpdateArticleState } from '../../hooks/useArticles'; // Import hook
import { useUIStore } from '../../store/uiStore';
import TagPopover from '../../components/TagPopover';
import { STAR_TAG, READ_TAG } from '../../constants';
import { getRandomColorClass } from '../../utils/colorUtils';

// Icons
const SpinnerIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
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
);
const IconCheckCircle = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);
const IconCircle = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface ArticleActionsProps {
  article: Article;
  className?: string;
}

const ArticleActions: React.FC<ArticleActionsProps> = memo(({ article, className }) => {
  const { isStarred, isRead, userTagLabels: displayedUserTags } = useArticleMetadata(article);
  const isAdmin = useUIStore((state) => state.isAdmin);
  const { mutateAsync: updateState } = useUpdateArticleState(); // Use hook directly

  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<'star' | 'read' | null>(null);

  const handleStateChange = async (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => {
    await updateState({ articleId, tagsToAdd, tagsToRemove });
  };

  const handleToggleState = async (action: 'star' | 'read') => {
    setIsLoading(action);
    const tag = action === 'star' ? STAR_TAG : READ_TAG;
    const isActive = action === 'star' ? isStarred : isRead;
    try {
      const tagsToAdd = isActive ? [] : [tag];
      const tagsToRemove = isActive ? [tag] : [];
      await handleStateChange(article.id, tagsToAdd, tagsToRemove);
    } finally {
      setIsLoading(null);
    }
  };

  const actionButtonClass =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-75';
  const mobileActionButtonClass =
    'flex flex-col items-center justify-center h-16 w-16 text-xs font-medium rounded-full p-1 gap-1 transition-transform active:scale-95';

  return (
    <div className={`relative mt-6 md:mt-8 ${className || ''}`}>
      {/* Desktop Buttons */}
      <div className="hidden flex-col md:flex">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/article/${article.id}`}
              className={`${actionButtonClass} bg-blue-800 text-white hover:bg-blue-900`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              阅读
            </Link>

            {isAdmin && (
              <>
                <button
                  onClick={() => handleToggleState('star')}
                  disabled={!!isLoading}
                  className={`${actionButtonClass} ${isStarred ? 'bg-amber-400 text-amber-950' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'} ${isLoading ? 'cursor-wait' : ''}`}
                >
                  {isLoading === 'star' ? (
                    <SpinnerIcon />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                  {isStarred ? '已收藏' : '收藏'}
                </button>
                <button
                  onClick={() => handleToggleState('read')}
                  disabled={!!isLoading}
                  className={`${actionButtonClass} ${isRead ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} ${isLoading ? 'cursor-wait' : ''}`}
                >
                  {isLoading === 'read' ? (
                    <SpinnerIcon />
                  ) : isRead ? (
                    <IconCheckCircle />
                  ) : (
                    <IconCircle />
                  )}
                  {isRead ? '已读' : '标记已读'}
                </button>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setIsTagPopoverOpen((prev) => !prev)}
                    className={`${actionButtonClass} bg-sky-200 text-sky-900 hover:bg-sky-300`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    标签
                  </button>
                  {isTagPopoverOpen && (
                    <TagPopover
                      article={article}
                      onClose={() => setIsTagPopoverOpen(false)}
                      onStateChange={handleStateChange}
                    />
                  )}
                </div>
              </>
            )}
            {displayedUserTags.length > 0 && (
              <div className="hidden flex-wrap items-center gap-2 md:flex">
                <div className="mx-1 h-6 border-l border-stone-300"></div>
                {displayedUserTags.map(
                  (tagLabel) =>
                    tagLabel && (
                      <span
                        key={tagLabel}
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getRandomColorClass(tagLabel)}`}
                      >
                        {tagLabel}
                      </span>
                    ),
                )}
              </div>
            )}
          </div>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${actionButtonClass} w-fit bg-stone-200 text-stone-800 hover:bg-stone-300`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            原文
          </a>
        </div>
      </div>
      {/* Mobile Buttons */}
      <div className="mt-8 md:hidden">
        <div className="flex items-center justify-around">
          <Link
            href={`/article/${article.id}`}
            className={`${mobileActionButtonClass} text-blue-600`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="sr-only text-xs">阅读</span>
          </Link>
          {isAdmin && (
            <>
              <button
                onClick={() => handleToggleState('star')}
                disabled={!!isLoading}
                className={`${mobileActionButtonClass} ${isStarred ? 'text-amber-500' : 'text-gray-600'} ${isLoading ? 'cursor-wait' : ''}`}
              >
                {isLoading === 'star' ? (
                  <SpinnerIcon />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                <span className="sr-only text-xs">{isStarred ? '已收藏' : '收藏'}</span>
              </button>
              <button
                onClick={() => handleToggleState('read')}
                disabled={!!isLoading}
                className={`${mobileActionButtonClass} ${isRead ? 'text-emerald-600' : 'text-gray-600'} ${isLoading ? 'cursor-wait' : ''}`}
              >
                {isLoading === 'read' ? (
                  <SpinnerIcon />
                ) : isRead ? (
                  <IconCheckCircle />
                ) : (
                  <IconCircle />
                )}
                <span className="sr-only text-xs">{isRead ? '已读' : '标记已读'}</span>
              </button>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsTagPopoverOpen((prev) => !prev)}
                  className={`${mobileActionButtonClass} text-sky-600`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="sr-only text-xs">标签</span>
                </button>
                {isTagPopoverOpen && (
                  <TagPopover
                    article={article}
                    onClose={() => setIsTagPopoverOpen(false)}
                    onStateChange={handleStateChange}
                  />
                )}
              </div>
            </>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${mobileActionButtonClass} text-gray-600`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            <span className="sr-only text-xs">原文</span>
          </a>
        </div>
        {displayedUserTags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-gray-200 pt-2">
            {displayedUserTags.map(
              (tagLabel) =>
                tagLabel && (
                  <span
                    key={tagLabel}
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getRandomColorClass(tagLabel)}`}
                  >
                    {tagLabel}
                  </span>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ArticleActions.displayName = 'ArticleActions';

export default ArticleActions;
