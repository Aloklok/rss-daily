// components/UnifiedArticleModal.tsx



import React, { useState, useEffect, useMemo } from 'react';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent, getArticlesDetails } from '../services/api';
import { useArticleStore } from '../store/articleStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';

// Import sub-components
import ArticleModalHeader from './article-modal/ArticleModalHeader';
import ArticleReaderView from './article-modal/ArticleReaderView';
import ArticleBriefingView from './article-modal/ArticleBriefingView';
import ArticleModalActions from './article-modal/ArticleModalActions';

interface UnifiedArticleModalProps {
    article: Article;
    onClose: () => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<any>;
    initialMode?: 'briefing' | 'reader';
}

const UnifiedArticleModal: React.FC<UnifiedArticleModalProps> = ({ article, onClose, onStateChange, initialMode = 'briefing' }) => {
    const [viewMode, setViewMode] = useState<'briefing' | 'reader'>(initialMode);
    // 原文内容状态
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isLoadingReader, setIsLoadingReader] = useState(false);

    // 简报数据加载状态
    const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
    // 1. 【新增】标记是否已经尝试过获取简报数据，防止死循环
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

    const updateArticle = useArticleStore(state => state.updateArticle);

    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const { isStarred, userTagLabels } = useArticleMetadata(article);

    // 判断是否拥有简报数据
    const hasBriefingData = useMemo(() => {
        return !!((article.summary && article.summary.length > 0) ||
            (article.verdict && article.verdict.score > 0) ||
            (article.briefingSection && article.briefingSection !== ''));
    }, [article]);

    // 2. 【新增】当文章 ID 变化时，重置尝试状态
    useEffect(() => {
        setHasAttemptedFetch(false);
        setIsLoadingBriefing(false);
        setReaderContent(null);
        setViewMode(initialMode);
        setReaderContent(null);
    }, [article.id, initialMode]);

    // 3. 【修改】获取 Supabase 数据逻辑
    useEffect(() => {
        // 增加 !hasAttemptedFetch 条件，确保只请求一次
        if (viewMode === 'briefing' && !hasBriefingData && !isLoadingBriefing && !hasAttemptedFetch) {
            const fetchBriefingData = async () => {
                setIsLoadingBriefing(true);
                try {
                    const detailsMap = await getArticlesDetails([article.id]);
                    const details = detailsMap[article.id];

                    if (details) {
                        const mergedArticle = {
                            ...article,
                            ...details,
                            tags: article.tags
                        };
                        updateArticle(mergedArticle);
                    }
                    // 即使 details 为空，我们也什么都不做，因为 finally 会标记已尝试
                } catch (error) {
                    console.error("Failed to fetch briefing details", error);
                } finally {
                    setIsLoadingBriefing(false);
                    // 4. 【关键】无论成功失败，标记为已尝试，防止死循环
                    setHasAttemptedFetch(true);
                }
            };
            fetchBriefingData();
        }
    }, [viewMode, hasBriefingData, isLoadingBriefing, hasAttemptedFetch, article, updateArticle]);

    // Keyboard event listener for Escape
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    // ... (切换到原文模式的 useEffect 保持不变) ...
    useEffect(() => {
        if (viewMode === 'reader' && !readerContent && !isLoadingReader) {
            const fetchContent = async () => {
                setIsLoadingReader(true);
                try {
                    const data = await getCleanArticleContent(article);
                    setReaderContent(data);
                } catch (error) {
                    console.error("Failed to fetch article content", error);
                } finally {
                    setIsLoadingReader(false);
                }
            };
            fetchContent();
        }
    }, [viewMode, article, readerContent, isLoadingReader]);

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
            <div onClick={onClose} className="fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 animate-fadeIn" />
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-neutral-50 dark:bg-midnight-bg bg-paper-texture dark:bg-none shadow-2xl z-40 transform transition-transform duration-300 animate-slideInRight flex flex-col">

                {/* Unified Close Button - Original Style Restored */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="关闭"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <ArticleModalHeader
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onClose={onClose}
                />

                {/* Content Body */}
                <div className="grow overflow-y-auto bg-neutral-50 dark:bg-midnight-bg">
                    {viewMode === 'briefing' ? (
                        <ArticleBriefingView
                            article={article}
                            isLoading={isLoadingBriefing}
                            hasBriefingData={hasBriefingData}
                            onReaderModeRequest={() => setViewMode('reader')}
                            onStateChange={onStateChange}
                        />
                    ) : (
                        <ArticleReaderView
                            article={article}
                            readerContent={readerContent}
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