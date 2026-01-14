// components/ArticleDetail.tsx

import React, { useState, useRef } from 'react';
import { Article, CleanArticleContent } from '@/types'; // 导入 Tag
import { useArticleMetadata } from '@/domains/reading/hooks/useArticleMetadata';
import { getRandomColorClass } from '@/shared/utils/colorUtils';
import ArticleTitleStar from './ArticleTitleStar';
import { useArticleContent } from '@/domains/reading/hooks/useArticleContent';
import { useSelectAll } from '@/shared/hooks/dom/useSelectAll';

interface ArticleDetailProps {
  article: Article;
  onClose?: () => void;
  initialContent?: CleanArticleContent | null;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article,
  onClose: _onClose,
  initialContent,
}) => {
  // 【Refactor】Use Unified Hook for Data Fetching & Caching
  const { data: content, isLoading, error } = useArticleContent(article, initialContent);

  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content || !contentRef.current) return;
    try {
      const text = contentRef.current.innerText;
      const fullText = `${content.title || article.title}\n\n${text}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // 【新增】调用辅助函数获取标签文本
  const { userTagLabels } = useArticleMetadata(article);

  // Enable Select All (Cmd+A) for the content area
  useSelectAll(contentRef);

  // Determine display data: prefer fetched content, fallback to prop article
  const displayTitle = (content && content.title) || article.title;
  const displaySource = (content && content.source) || article.sourceName;
  const displayContent = content && content.content;

  return (
    <div className="overflow-x-hidden p-2 md:p-8">
      <article>
        <header className="mb-3 border-b border-gray-200 pb-3 md:mb-6 md:pb-6 dark:border-stone-700">
          <h1 className="dark:text-midnight-text-reader mb-2 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
            <ArticleTitleStar
              article={article}
              className="relative top-[3px] mr-2 inline-block h-8 w-8"
            />
            <span className="align-middle">{displayTitle}</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">来源: {displaySource}</p>

          {/* 【核心修改】在这里渲染标签 */}
          {userTagLabels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {userTagLabels.map((label) => (
                <span
                  key={label}
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getRandomColorClass(label)}`}
                >
                  #{label}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={handleCopy}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
              title="复制全文"
            >
              {copied ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 cursor-pointer text-green-600 dark:text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="cursor-pointer text-green-600 dark:text-green-400">已复制</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 cursor-pointer"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  <span className="cursor-pointer">复制</span>
                </>
              )}
            </button>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
              title="打开原文"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 cursor-pointer"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span className="cursor-pointer">原文</span>
            </a>
          </div>
        </header>

        {/* Body content section */}
        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>无法加载文章内容：{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        ) : displayContent ? (
          <div
            id="article-detail-content"
            ref={contentRef}
            className="prose md:prose-lg dark:text-midnight-text-reader dark:prose-invert mt-6 max-w-none leading-relaxed break-words text-gray-800 select-text"
            // Content is already sanitized on the server (see lib/server/dataFetcher.ts)
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        ) : (
          <div className="py-10 text-gray-500">
            <p>正在获取全文内容...</p>
            <p className="mt-2 text-sm">如果长时间未加载，请尝试点击上方“原文”按钮。</p>
          </div>
        )}
      </article>
    </div>
  );
};

export default ArticleDetail;
