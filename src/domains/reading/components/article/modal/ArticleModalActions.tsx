import React from 'react';
import { Article } from '@/shared/types';
import { STAR_TAG } from '@/domains/interaction/constants';
import TagPopover from '@/shared/ui/TagPopover';

interface ArticleModalActionsProps {
  article: Article;
  isStarred: boolean;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<any>;
  isTagPopoverOpen: boolean;
  setIsTagPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

import { useUIStore } from '@/shared/store/uiStore';

const ArticleModalActions: React.FC<ArticleModalActionsProps> = ({
  article,
  isStarred,
  onStateChange,
  isTagPopoverOpen,
  setIsTagPopoverOpen,
}) => {
  const isAdmin = useUIStore((state) => state.isAdmin);

  if (!isAdmin) return null;

  return (
    <div className="absolute right-8 bottom-8 z-50 flex flex-col-reverse items-center gap-y-3">
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsTagPopoverOpen((prev) => !prev)}
          className="rounded-full bg-sky-600 p-3 text-white shadow-lg transition-all hover:bg-sky-700"
          aria-label="更多标签"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
            article={article}
            onClose={() => setIsTagPopoverOpen(false)}
            onStateChange={onStateChange}
          />
        )}
      </div>
      <button
        onClick={() => {
          onStateChange(article.id, isStarred ? [] : [STAR_TAG], isStarred ? [STAR_TAG] : []);
        }}
        className={`rounded-full p-3 text-white shadow-lg transition-all ${
          isStarred ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-950'
        }`}
        aria-label={isStarred ? '取消收藏' : '收藏'}
      >
        {isStarred ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ArticleModalActions;
