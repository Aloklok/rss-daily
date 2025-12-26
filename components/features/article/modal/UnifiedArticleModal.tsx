// components/UnifiedArticleModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Article } from '../../../../types';
import { useArticleMetadata } from '../../../../hooks/useArticleMetadata';
import { useArticleContent } from '../../../../hooks/useArticleContent';
import { useBriefingDetails } from '../../../../hooks/useBriefingDetails';
import { useScrollLock } from '../../../../hooks/dom/useScrollLock';

// Import sub-components
import ArticleModalHeader from './ArticleModalHeader';
import ArticleReaderView from './ArticleReaderView';
import ArticleBriefingView from './ArticleBriefingView';
import ArticleModalActions from './ArticleModalActions';

interface UnifiedArticleModalProps {
  article: Article;
  onClose: () => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<any>;
  initialMode?: 'briefing' | 'reader';
}

const UnifiedArticleModal: React.FC<UnifiedArticleModalProps> = ({
  article,
  onClose,
  onStateChange,
  initialMode = 'briefing',
}) => {
  const [viewMode, setViewMode] = useState<'briefing' | 'reader'>(initialMode);

  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const { isStarred, userTagLabels } = useArticleMetadata(article);

  // 判断是否拥有简报数据
  const hasBriefingData = useMemo(() => {
    return !!(
      (article.summary && article.summary.length > 0) ||
      (article.verdict && article.verdict.score > 0) ||
      (article.briefingSection && article.briefingSection !== '')
    );
  }, [article]);

  // 1. Hook: Fetch Briefing Data (if missing)
  const { isLoading: isLoadingBriefing } = useBriefingDetails(article, hasBriefingData, {
    enabled: viewMode === 'briefing',
  });

  // 2. Hook: Fetch Reader Content
  // No initialData passed here because Modal is client-only entry.
  const { data: readerContent, isLoading: isLoadingReader } = useArticleContent(article, null, {
    enabled: viewMode === 'reader',
  });

  // Reset view mode on article change (Handled by parent key prop now)
  // useEffect(() => {
  //   setViewMode(initialMode);
  // }, [article.id, initialMode]);

  // Lock body scroll when modal is open
  useScrollLock(true);

  // Keyboard event listener for Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Update document title when modal is open
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${article.title} - RSS Briefing Hub`;
    return () => {
      document.title = originalTitle;
    };
  }, [article.title]);

  // ...

  // Update document title when modal is open
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${article.title} - RSS Briefing Hub`;
    return () => {
      document.title = originalTitle;
    };
  }, [article.title]);

  return (
    <>
      <div
        onClick={onClose}
        className="animate-fadeIn fixed inset-0 z-30 bg-black/60 transition-opacity duration-300"
      />
      <div className="dark:bg-midnight-bg bg-paper-texture animate-slideInRight fixed top-0 right-0 z-40 flex h-full w-full max-w-2xl transform flex-col bg-neutral-50 shadow-2xl transition-transform duration-300 dark:bg-none">
        {/* Unified Close Button - Original Style Restored */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 cursor-pointer rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title="关闭"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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

        <ArticleModalHeader viewMode={viewMode} setViewMode={setViewMode} onClose={onClose} />

        {/* Content Body */}
        <div className="dark:bg-midnight-bg grow overflow-y-auto bg-neutral-50">
          {viewMode === 'briefing' ? (
            <ArticleBriefingView
              article={article}
              readerContent={readerContent}
              isLoading={isLoadingBriefing}
              hasBriefingData={hasBriefingData}
              onReaderModeRequest={() => setViewMode('reader')}
              onStateChange={onStateChange}
            />
          ) : (
            <ArticleReaderView
              article={article}
              readerContent={readerContent ?? null}
              isLoading={isLoadingReader}
              userTagLabels={userTagLabels}
            />
          )}
        </div>

        <ArticleModalActions
          article={article}
          isStarred={isStarred}
          onStateChange={onStateChange}
          isTagPopoverOpen={isTagPopoverOpen}
          setIsTagPopoverOpen={setIsTagPopoverOpen}
        />
      </div>
    </>
  );
};

export default UnifiedArticleModal;
