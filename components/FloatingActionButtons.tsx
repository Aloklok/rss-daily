// components/FloatingActionButtons.tsx

import React, { useState } from 'react';
import { Article, Tag } from '../types';
import TagPopover from './TagPopover';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { useArticleStore } from '../store/articleStore';
import { READ_TAG, STAR_TAG } from '../constants';

interface FloatingActionButtonsProps {
    selectedArticleId: string | number | null; // 【修改】接收 ID
    articleIdsInView: (string | number)[]; // 【新增】接收当前视图中的所有文章 ID
    isBriefingFetching: boolean;
    isUpdatingArticle: boolean;
    isMarkingAsRead: boolean;
    // hasUnreadInView: boolean; // 【移除】内部计算
    onArticleStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
    onMarkAllClick: () => void;
    onRefreshToHome: () => void;
    isAdmin: boolean;
}

import { useUIStore } from '../store/uiStore';

// ... (imports remain the same)

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
    selectedArticleId,
    articleIdsInView,
    isBriefingFetching,
    isUpdatingArticle,
    isMarkingAsRead,
    onArticleStateChange,
    onMarkAllClick,
    onRefreshToHome,
    isAdmin,
}) => {
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    // const isAdmin = useUIStore(state => state.isAdmin); // Removed in favor of prop

    // 1. 【新增】内部订阅：获取选中的文章对象
    const selectedArticle = useArticleStore(state =>
        selectedArticleId ? state.articlesById[selectedArticleId] : null
    );

    // 2. 【新增】内部订阅：计算是否有未读文章
    const hasUnreadInView = useArticleStore(state => {
        return articleIdsInView.some(id => {
            const article = state.articlesById[id];
            return article && !article.tags?.includes(READ_TAG);
        });
    });

    const { isStarred } = useArticleMetadata(selectedArticle);

    // 【改】使用单一 return 语句，结构更清晰
    return (
        <div className="fixed bottom-8 right-8 z-20 flex flex-col-reverse items-center gap-y-3">
            {/* --- 共享按钮：始终显示 --- */}
            <button
                onClick={onRefreshToHome}
                disabled={isBriefingFetching}
                className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all"
                aria-label="Back to today's briefing"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </button>

            {/* --- 条件渲染块：根据是否有选中文章来显示不同的按钮 --- */}
            {isAdmin && (
                selectedArticle ? (
                    <>
                        {/* 仅在有选中文章时显示：标签和收藏按钮 */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className="p-3 bg-sky-600 text-white rounded-full shadow-lg hover:bg-sky-700 transition-all" aria-label="Tag article">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                            </button>
                            {isTagPopoverOpen && (
                                <TagPopover
                                    article={selectedArticle}
                                    onClose={() => setIsTagPopoverOpen(false)}
                                    onStateChange={onArticleStateChange}
                                />
                            )}
                        </div>
                        <button
                            onClick={() => {
                                onArticleStateChange(selectedArticle.id, isStarred ? [] : [STAR_TAG], isStarred ? [STAR_TAG] : []);
                            }}
                            disabled={isUpdatingArticle}
                            className={`p-3 text-white rounded-full shadow-lg transition-all disabled:bg-gray-500 ${isStarred ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-950'
                                }`}
                            aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            {isStarred ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            )}
                        </button>
                    </>
                ) : (
                    <>
                        {/* 仅在没有选中文章时显示：全部标记已读按钮 */}
                        <button
                            onClick={onMarkAllClick}
                            disabled={isMarkingAsRead || !hasUnreadInView}
                            className={`p-3 text-white rounded-full shadow-lg transition-all disabled:bg-gray-500 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-950`}
                            aria-label="Mark all as read"
                        >
                            {isMarkingAsRead ? (
                                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                        </button>
                    </>
                )
            )}

            {/* --- 共享按钮：始终显示 --- */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all" aria-label="Back to top">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M12 19V4" />
                </svg>
            </button>
        </div>
    );
};

export default FloatingActionButtons;