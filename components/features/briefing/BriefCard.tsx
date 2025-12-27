// components/ArticleCard.tsx

import React, { useState, memo } from 'react';
import Link from 'next/link';
import { Article } from '../../../types';
import TagPopover from '../../common/ui/TagPopover';
import { useArticleMetadata } from '../../../hooks/useArticleMetadata';
import { getRandomColorClass } from '../../../utils/colorUtils';
import { toShortId } from '../../../utils/idHelpers';
import { STAR_TAG, READ_TAG } from '../../../constants';
import ArticleTitleStar from '../article/ArticleTitleStar';

// 1. 【修改】将所有辅助组件和常量移至文件顶层，使其不随 ArticleCard 的渲染而重新创建

const CALLOUT_THEMES = {
  一句话总结: { icon: '📝', color: 'pink' },
  技术洞察: { icon: '🔬', color: 'blue' },
  值得注意: { icon: '⚠️', color: 'brown' },
  市场观察: { icon: '📈', color: 'green' },
} as const;
const calloutCardClasses = {
  pink: {
    bg: 'bg-pink-100 dark:bg-midnight-callout-pink-bg',
    title: 'text-pink-950 dark:text-midnight-callout-pink-title',
    body: 'text-pink-900 dark:text-midnight-callout-pink-body',
    emphasis: 'font-bold text-violet-700',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-midnight-callout-blue-bg',
    title: 'text-blue-950 dark:text-midnight-callout-blue-title',
    body: 'text-blue-900 dark:text-midnight-callout-blue-body',
    emphasis: 'font-bold text-violet-700',
  },
  brown: {
    bg: 'bg-orange-100 dark:bg-midnight-callout-orange-bg',
    title: 'text-orange-950 dark:text-midnight-callout-orange-title',
    body: 'text-orange-900 dark:text-midnight-callout-orange-body',
    emphasis: 'font-bold text-violet-700',
  },
  green: {
    bg: 'bg-green-100 dark:bg-midnight-callout-green-bg',
    title: 'text-green-950 dark:text-midnight-callout-green-title',
    body: 'text-green-900 dark:text-midnight-callout-green-body',
    emphasis: 'font-bold text-violet-700',
  },
};
const parseFormattedText = (text: string, emphasisClass: string = 'font-semibold text-current') => {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className={emphasisClass}>
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="mx-0.5 rounded-sm bg-orange-100 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-orange-900"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
    }
    return part;
  });
};

const formatArticleForClipboard = (article: Article): string => {
  const publishedDate = new Date(article.published).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
  const keywords = (article.keywords || []).join('\n');

  return [
    article.title,
    `${article.sourceName} • 发布于 ${publishedDate} `,
    `${article.verdict.type} • ${article.category} • 评分: ${article.verdict.score}/10`,
    keywords,
    '',
    '【一句话总结】',
    article.summary || '',
    '',
    '【技术洞察】',
    article.highlights,
    '',
    '【值得注意】',
    article.critiques,
    '',
    '【市场观察】',
    article.marketTake,
  ].join('\n');
};

// --- 外部化的组件定义 ---

const SpinnerIcon: React.FC = memo(() => (
  <svg
    className="size-4 animate-spin"
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
));
SpinnerIcon.displayName = 'SpinnerIcon';

const IconCopy: React.FC<{ className?: string }> = memo(({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`size-5 ${className || ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
));
IconCopy.displayName = 'IconCopy';

const IconCheck: React.FC<{ className?: string }> = memo(({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`size-5 ${className || ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
));
IconCheck.displayName = 'IconCheck';

const IconCheckCircle: React.FC = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="size-4"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
));
IconCheckCircle.displayName = 'IconCheckCircle';

const IconCircle: React.FC = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="size-4"
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
));
IconCircle.displayName = 'IconCircle';

interface CalloutProps {
  title: keyof typeof CALLOUT_THEMES;
  content: string;
}
const Callout: React.FC<CalloutProps> = memo(({ title, content }) => {
  const theme = CALLOUT_THEMES[title];
  const colors = calloutCardClasses[theme.color];
  return (
    <aside className={`rounded-2xl p-6 ${colors.bg}`}>
      <div className="mb-3 flex items-center gap-x-3">
        <span className="text-2xl">{theme.icon}</span>
        <h4 className={`text-lg font-bold ${colors.title}`}>{title}</h4>
      </div>
      <div className={`${colors.body} text-[15px] leading-relaxed font-medium whitespace-pre-line`}>
        {parseFormattedText(content, colors.emphasis)}
      </div>
    </aside>
  );
});
Callout.displayName = 'Callout';

interface ActionButtonsProps {
  article: Article;
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<void>;
  className?: string;
}

import { useUIStore } from '../../../store/uiStore';

const ActionButtons: React.FC<ActionButtonsProps> = memo(
  ({ article, onReaderModeRequest, onStateChange, className }) => {
    const { isStarred, isRead, userTagLabels: displayedUserTags } = useArticleMetadata(article);
    const isAdmin = useUIStore((state) => state.isAdmin);

    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<'star' | 'read' | null>(null);

    const handleToggleState = async (action: 'star' | 'read') => {
      setIsLoading(action);
      const tag = action === 'star' ? STAR_TAG : READ_TAG;
      const isActive = action === 'star' ? isStarred : isRead;
      try {
        const tagsToAdd = isActive ? [] : [tag];
        const tagsToRemove = isActive ? [tag] : [];
        await onStateChange(article.id, tagsToAdd, tagsToRemove);
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
              <button
                onClick={() => onReaderModeRequest(article)}
                className={`${actionButtonClass} cursor-pointer bg-blue-800 text-white hover:bg-blue-900`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4 cursor-pointer"
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
                <span className="cursor-pointer">阅读</span>
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleToggleState('star')}
                    disabled={!!isLoading}
                    className={`${actionButtonClass} ${isStarred ? 'bg-amber-400 text-amber-950' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'} ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    {isLoading === 'star' ? (
                      <SpinnerIcon />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-4 cursor-pointer"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    <span className="cursor-pointer">{isStarred ? '已收藏' : '收藏'}</span>
                  </button>
                  <button
                    onClick={() => handleToggleState('read')}
                    disabled={!!isLoading}
                    className={`${actionButtonClass} ${isRead ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    {isLoading === 'read' ? (
                      <SpinnerIcon />
                    ) : isRead ? (
                      <IconCheckCircle />
                    ) : (
                      <IconCircle />
                    )}
                    <span className="cursor-pointer">{isRead ? '已读' : '标记已读'}</span>
                  </button>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setIsTagPopoverOpen((prev) => !prev)}
                      className={`${actionButtonClass} cursor-pointer bg-sky-200 text-sky-900 hover:bg-sky-300`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-4 cursor-pointer"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="cursor-pointer">标签</span>
                    </button>
                    {isTagPopoverOpen && (
                      <TagPopover
                        article={article}
                        onClose={() => setIsTagPopoverOpen(false)}
                        onStateChange={onStateChange}
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
              className={`${actionButtonClass} w-fit cursor-pointer bg-stone-200 text-stone-800 hover:bg-stone-300`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-4 cursor-pointer"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span className="cursor-pointer">原文</span>
            </a>
          </div>
        </div>
        {/* Mobile Buttons */}
        <div className="mt-8 md:hidden">
          <div className="flex items-center justify-around">
            <button
              onClick={() => onReaderModeRequest(article)}
              className={`${mobileActionButtonClass} cursor-pointer text-blue-600`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-7 cursor-pointer"
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
              <span className="sr-only cursor-pointer text-xs">阅读</span>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => handleToggleState('star')}
                  disabled={!!isLoading}
                  className={`${mobileActionButtonClass} ${isStarred ? 'text-amber-500' : 'text-gray-600'} ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                >
                  {isLoading === 'star' ? (
                    <SpinnerIcon />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-7 cursor-pointer"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                  <span className="sr-only cursor-pointer text-xs">
                    {isStarred ? '已收藏' : '收藏'}
                  </span>
                </button>
                <button
                  onClick={() => handleToggleState('read')}
                  disabled={!!isLoading}
                  className={`${mobileActionButtonClass} ${isRead ? 'text-emerald-600' : 'text-gray-600'} ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                >
                  {isLoading === 'read' ? (
                    <SpinnerIcon />
                  ) : isRead ? (
                    <IconCheckCircle />
                  ) : (
                    <IconCircle />
                  )}
                  <span className="sr-only cursor-pointer text-xs">
                    {isRead ? '已读' : '标记已读'}
                  </span>
                </button>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setIsTagPopoverOpen((prev) => !prev)}
                    className={`${mobileActionButtonClass} cursor-pointer text-sky-600`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-7 cursor-pointer"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="sr-only cursor-pointer text-xs">标签</span>
                  </button>
                  {isTagPopoverOpen && (
                    <TagPopover
                      article={article}
                      onClose={() => setIsTagPopoverOpen(false)}
                      onStateChange={onStateChange}
                    />
                  )}
                </div>
              </>
            )}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`${mobileActionButtonClass} cursor-pointer text-gray-600`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-7 cursor-pointer"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span className="sr-only cursor-pointer text-xs">原文</span>
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
  },
);
ActionButtons.displayName = 'ActionButtons';

interface ArticleCardProps {
  article: Article;
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<void>;
  showActions?: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onReaderModeRequest,
  onStateChange,
  showActions = true,
}) => {
  // 2. 【删除】内部组件定义已全部移出
  const publishedDate = new Date(article.published).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
  const allKeywords = [...(article.keywords || [])];
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatArticleForClipboard(article);
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <article data-testid="article-card" className="@container py-2 transition-opacity duration-300">
      <header className="mb-10">
        <h3 className="dark:text-midnight-text-title mb-6 font-serif text-2xl leading-tight font-bold text-stone-900 lg:text-2xl">
          <ArticleTitleStar
            article={article}
            className="relative top-[3px] mr-2 inline-block size-6"
          />
          {/* SEO-Only Link: Behaves like text for users (preventDefault), but href remains for crawlers */}
          <Link
            href={`/article/${toShortId(String(article.id))}`}
            prefetch={false}
            data-testid={`article-link-${article.id}`}
            onClick={(e) => {
              e.preventDefault();
              onReaderModeRequest(article);
            }}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            className="align-middle transition-colors hover:no-underline"
          >
            {article.title}
          </Link>
          <button
            onClick={handleCopy}
            className={`ml-3 inline-block rounded-sm p-1 align-middle transition-all duration-200 ${isCopied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300'} cursor-pointer`}
            title={isCopied ? '复制成功' : '复制文章内容'}
          >
            {isCopied ? (
              <IconCheck className="cursor-pointer" />
            ) : (
              <IconCopy className="cursor-pointer" />
            )}
          </button>
        </h3>
        <div className="dark:bg-midnight-metadata-bg dark:border-midnight-badge space-y-3 rounded-lg border border-gray-200 bg-gray-100 p-6">
          <div className="flex flex-wrap items-center gap-x-4 text-sm text-black">
            <span>{article.sourceName}</span>
            <span>&bull;</span>
            <span>发布于 {publishedDate}</span>
          </div>
          <div className="flex flex-wrap items-center text-sm text-stone-600">
            <span className="mr-2 font-medium">{article.verdict.type}</span>
            <span className="mr-2">&bull;</span>
            <span className="mr-2 font-medium">{article.category}</span>
            <span className="mr-2">&bull;</span>
            <span
              className={`font-semibold ${article.verdict.score >= 8 ? 'text-green-600' : article.verdict.score >= 6 ? 'text-amber-600' : 'text-red-600'}`}
            >
              评分: {article.verdict.score}/10
            </span>
          </div>
          {allKeywords && allKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {allKeywords.map((tag) => (
                <span
                  key={tag}
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getRandomColorClass(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-8 @min-[35rem]:grid-cols-2">
        <Callout title="一句话总结" content={article.summary || ''} />
        <Callout title="技术洞察" content={article.highlights} />
        <Callout title="值得注意" content={article.critiques} />
        <Callout title="市场观察" content={article.marketTake} />
      </div>
      {showActions && (
        <ActionButtons
          article={article}
          onReaderModeRequest={onReaderModeRequest}
          onStateChange={onStateChange}
        />
      )}
    </article>
  );
};

export default memo(ArticleCard);
