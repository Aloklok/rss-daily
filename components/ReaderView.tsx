import React, { useRef, useEffect, useState } from 'react';
import { CleanArticleContent, Article } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { getRandomColorClass } from '../utils/colorUtils';
import { removeEmptyParagraphs } from '../utils/contentUtils';

interface ReaderViewProps {
  article: Article;
  readerContent: CleanArticleContent | null;
  isLoading: boolean;
  userTagLabels: string[];
  onClose: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({
  article,
  readerContent,
  isLoading,
  userTagLabels,
  onClose,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!readerContent || !contentRef.current) return;

    try {
      const text = contentRef.current.innerText;
      const fullText = `${readerContent.title}\n\n${text}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Handle Ctrl/Cmd+A to select only article content
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        if (contentRef.current) {
          event.preventDefault();
          const range = document.createRange();
          range.selectNodeContents(contentRef.current);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (isLoading) return <LoadingSpinner />;

  if (!readerContent)
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>无法加载文章内容。</p>
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-blue-600 dark:text-blue-400"
        >
          查看原文
        </a>
      </div>
    );

  return (
    <div className="dark:bg-midnight-bg animate-fadeIn fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 cursor-pointer text-gray-600 dark:text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <article className="mt-8">
          <h1 className="dark:text-midnight-text-reader mb-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
            {readerContent.title}
          </h1>
          <div className="mb-8 border-b pb-4 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">来源: {readerContent.source}</p>
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
            <div className="mt-4 flex justify-end gap-2">
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
                    <span className="cursor-pointer text-green-600 dark:text-green-400">
                      已复制
                    </span>
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
          </div>
          <div
            id="article-reader-content"
            ref={contentRef}
            className="prose prose-lg dark:prose-invert dark:text-midnight-text-reader max-w-none leading-relaxed text-gray-800 select-text"
            dangerouslySetInnerHTML={{ __html: removeEmptyParagraphs(readerContent.content) }}
          />
        </article>
      </div>
    </div>
  );
};

export default ReaderView;
