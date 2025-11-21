// components/UnifiedArticleModal.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Article, CleanArticleContent } from '../types';
import ArticleCard from './ArticleCard';
import TagPopover from './TagPopover';
import LoadingSpinner from './LoadingSpinner';
import { getCleanArticleContent, getArticlesDetails } from '../services/api';
import { useArticleStore } from '../store/articleStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';
import { STAR_TAG, READ_TAG } from '../api/_constants';

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
    const contentRef = useRef<HTMLDivElement>(null);

    // 判断是否拥有简报数据
    const hasBriefingData = useMemo(() => {
        return (article.summary && article.summary.length > 0) ||
            (article.verdict && article.verdict.score > 0) ||
            (article.briefingSection && article.briefingSection !== '');
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

    // ... (键盘事件 useEffect 保持不变) ...
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if ((event.metaKey || event.ctrlKey) && event.key === 'a' && viewMode === 'reader') {
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
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose, viewMode]);

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

    const renderReaderContent = () => {
        if (isLoadingReader) return <LoadingSpinner />;

        if (!readerContent) return (
            <div className="p-8 text-center text-gray-500">
                <p>无法加载文章内容。</p>
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 mt-2 inline-block">查看原文</a>
            </div>
        );

        return (
            <article className="p-6 md:p-8 select-none animate-fadeIn">
                <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 mb-2">{readerContent.title}</h1>
                <div className="mb-6 border-b pb-4">
                    <p className="text-gray-500">来源: {readerContent.source}</p>
                    {userTagLabels.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {userTagLabels.map(label => (
                                <span key={label} className={`text-sm font-semibold inline-block py-1 px-3 rounded-full ${getRandomColorClass(label)}`}>
                                    #{label}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-end">
                        <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-stone-200 hover:bg-stone-300 text-stone-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                            <span>原文</span>
                        </a>
                    </div>
                </div>
                <div ref={contentRef} className="prose prose-lg max-w-none text-gray-800 leading-relaxed select-text" dangerouslySetInnerHTML={{ __html: readerContent.content }} />
            </article>
        );
    };

    const renderBriefingContent = () => {
        // 5. 【修改】只有在正在加载，且还没尝试完成时显示 Loading
        if (isLoadingBriefing) {
            return (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <LoadingSpinner />
                    <p className="text-gray-500 text-sm">正在抓取智能简报...</p>
                </div>
            );
        }

        // 6. 【修改】如果没数据，且已经尝试过获取了，显示 Fallback
        if (!hasBriefingData) {
            return (
                <div className="flex flex-col items-center justify-center h-64 p-8 text-center animate-fadeIn">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无智能简报</h3>
                    <p className="text-gray-500 mb-6">该文章尚未完成 AI 分析，请直接阅读原文。</p>
                    <button
                        onClick={() => setViewMode('reader')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        切换到原文阅读
                    </button>
                </div>
            );
        }

        return (
            <div className="p-4 md:p-6">
                <ArticleCard
                    article={article}
                    showActions={false}
                    onReaderModeRequest={() => setViewMode('reader')}
                    onStateChange={onStateChange}
                />
            </div>
        );
    };

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 animate-fadeIn" />
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-neutral-50 bg-paper-texture shadow-2xl z-40 transform transition-transform duration-300 animate-slideInRight flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b bg-white/80 backdrop-blur-md z-10">
                    <div className="flex bg-gray-200/80 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('briefing')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'briefing' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            📊 智能简报
                        </button>
                        <button
                            onClick={() => setViewMode('reader')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'reader' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            📄 原文阅读
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-grow overflow-y-auto bg-neutral-50">
                    {viewMode === 'briefing' ? renderBriefingContent() : renderReaderContent()}
                </div>

                {/* Floating Action Buttons */}
                <div className="absolute bottom-8 right-8 z-50 flex flex-col-reverse items-center gap-y-3">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className="p-3 bg-sky-600 text-white rounded-full shadow-lg hover:bg-sky-700 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
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
                        className={`p-3 text-white rounded-full shadow-lg transition-all ${isStarred ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-950'
                            }`}
                    >
                        {isStarred ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default UnifiedArticleModal;