// App.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import FloatingActionButtons from './components/FloatingActionButtons';
import UnifiedArticleModal from './components/UnifiedArticleModal';
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import { Article, Tag, BriefingReport, GroupedArticles, Filter } from './types';
import { READ_TAG } from './constants';
import { useArticleStore, selectSelectedArticle } from './store/articleStore';
import { useQueryClient } from '@tanstack/react-query';
import { useFilters } from './hooks/useFilters';
import { getTodayInShanghai, getCurrentTimeSlotInShanghai, getCleanArticleContent } from './services/api';
import {
    useBriefingArticles,
    useFilteredArticles,
    useUpdateArticleState,
    useMarkAllAsRead,
    useSearchResults
} from './hooks/useArticles';
import { useArticleMetadata } from './hooks/useArticleMetadata';

const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ isVisible: false, message: '', type: 'info' });
    const queryClient = useQueryClient();

    // ----- 1. 修改: 优化 modalArticle 订阅，避免全局重渲染 -----
    const modalArticleId = useArticleStore(state => state.modalArticleId);
    const modalInitialMode = useArticleStore(state => state.modalInitialMode);
    const openModal = useArticleStore(state => state.openModal);
    const closeModal = useArticleStore(state => state.closeModal);

    // 只订阅当前模态框展示的那一篇文章，而不是整个 articlesById
    const modalArticle = useArticleStore(state =>
        state.modalArticleId ? state.articlesById[state.modalArticleId] : null
    );

    const activeFilter = useArticleStore(state => state.activeFilter);
    const timeSlot = useArticleStore(state => state.timeSlot);
    const setTimeSlot = useArticleStore(state => state.setTimeSlot);

    const { data: searchResultIds, isLoading: isSearchLoading } = useSearchResults(
        activeFilter?.type === 'search' ? activeFilter.value : null
    );

    const setSelectedArticleId = useArticleStore(state => state.setSelectedArticleId);
    const addArticles = useArticleStore(state => state.addArticles);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ isVisible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);


    const handleOpenFromList = useCallback((article: Article) => {
        addArticles([article]);
        openModal(article.id, 'briefing');
    }, [addArticles, openModal]);

    const handleOpenFromBriefingCard = useCallback((article: Article) => {
        addArticles([article]);
        openModal(article.id, 'reader');
    }, [addArticles, openModal]);


    const handleOpenMainDetail = useCallback((article: Article) => {
        setSelectedArticleId(article.id);
        addArticles([article]);
    }, [setSelectedArticleId, addArticles]);

    const {
        isInitialLoad,
        isRefreshing: isRefreshingFilters,
        datesForMonth,
        availableFilters,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        handleFilterChange,
        handleResetFilter,
        refreshFilters,
        dailyStatuses,
        handleToggleDailyStatus,
    } = useFilters();

    const { data: briefingArticleIds, isLoading: isBriefingLoading, isFetching: isBriefingFetching } = useBriefingArticles(
        activeFilter?.type === 'date' ? activeFilter.value : null,
        timeSlot
    );

    const { data: filteredArticleIdsFromQuery, isLoading: isFilterLoading } = useFilteredArticles(
        (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? activeFilter.value : null
    );

    const filteredArticleIds = filteredArticleIdsFromQuery || [];

    // ----- 2. 修改: 移除 unreadArticleIdsInView 计算逻辑 -----
    // 该逻辑已移动到 FloatingActionButtons 组件内部

    // ----- 3. 修改: 计算当前视图中的文章 ID 列表，传递给 FAB -----
    const articleIdsInView = useMemo(() => {
        if (activeFilter?.type === 'date') {
            return briefingArticleIds || [];
        } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
            return filteredArticleIds || [];
        } else if (activeFilter?.type === 'search') {
            return searchResultIds || [];
        }
        return [];
    }, [activeFilter, briefingArticleIds, filteredArticleIds, searchResultIds]);


    const handleMarkAllClick = () => {
        // 这里的逻辑稍微复杂一点，因为 markAllAsRead 需要 ID 列表。
        // 我们可以直接使用 articleIdsInView，因为 FAB 内部已经判断了是否有未读。
        // 但为了保持一致性，我们可以在这里重新获取一下未读 ID，或者直接把 articleIdsInView 传给 mutation，后端会处理。
        // 简单起见，我们传递当前视图的所有 ID，store/API 层会过滤掉已读的。
        if (articleIdsInView.length > 0) {
            markAllAsRead(articleIdsInView);
        } else {
            showToast('没有需要标记的文章', 'info');
        }
    };

    // ----- 4. 修改: 移除 reports 计算逻辑 -----
    // 该逻辑已移动到 Briefing 组件内部

    const sidebarArticle = useArticleStore(selectSelectedArticle);

    const { mutateAsync: updateArticleState, isPending: isUpdatingArticle } = useUpdateArticleState();
    const { mutate: markAllAsRead, isPending: isMarkingAsRead } = useMarkAllAsRead();

    const handleArticleStateChange = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
        await updateArticleState({ articleId, tagsToAdd, tagsToRemove }, {
            onSuccess: (updatedArticle) => {
            },
            onError: (error) => {
                showToast('标签更新失败', 'error');
            }
        });
    };

    const onFilterChange = useCallback((filter: Filter) => {
        setSelectedArticleId(null);
        if (!isMdUp) setIsSidebarCollapsed(true);
    }, [setSelectedArticleId, isMdUp]);

    const onMonthChange = useCallback((month: string) => {
        setSelectedMonth(month);
    }, [setSelectedMonth]);

    const handleRefreshToHome = useCallback(async () => {
        setSelectedArticleId(null);
        setTimeSlot(getCurrentTimeSlotInShanghai());
        await queryClient.invalidateQueries({ queryKey: ['briefing'] });
        handleResetFilter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [queryClient, setSelectedArticleId, handleResetFilter, setTimeSlot]);

    useEffect(() => {
        const updateViewport = () => {
            setIsSidebarCollapsed(window.innerWidth < 768);
            setIsMdUp(window.innerWidth >= 768);
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    const mainContentRef = useRef<HTMLDivElement | null>(null);
    const isLoading = isInitialLoad || isBriefingLoading || isFilterLoading || isBriefingFetching || isSearchLoading;

    useEffect(() => {
        if (!isSidebarCollapsed && !isMdUp) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isSidebarCollapsed, isMdUp]);

    useEffect(() => {
        if (window.location.pathname === '/now') {
            handleResetFilter();
            window.history.replaceState(null, '', '/');
        }
    }, [handleResetFilter]);

    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans">
            {!isSidebarCollapsed && !isMdUp && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarCollapsed(true)} aria-hidden="true" />
            )}
            <div className={`h-full bg-gray-50 border-r border-gray-200 z-50 transition-all duration-300 ease-in-out ${!isMdUp ? `fixed top-0 left-0 w-64 ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}` : `md:fixed md:top-0 md:bottom-0 md:left-0 md:overflow-y-auto ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:pointer-events-none' : 'md:w-80 md:opacity-100'}`}`}>
                <Sidebar
                    isInitialLoading={isInitialLoad}
                    isRefreshingFilters={isRefreshingFilters}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={onMonthChange}
                    onOpenArticle={handleOpenMainDetail}
                    onRefresh={refreshFilters}
                    datesForMonth={datesForMonth}
                    dailyStatuses={dailyStatuses}
                    onToggleDailyStatus={handleToggleDailyStatus}
                />
            </div>

            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`fixed top-5 p-2 bg-white rounded-full shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 hover:border-gray-300 z-50
                    ${modalArticleId && !isMdUp ? 'hidden' : ''} 
                    ${activeFilter?.type === 'date' && !isMdUp ? 'hidden' : ''}
                    md:left-5 md:transition-all md:duration-300 ${isSidebarCollapsed ? 'md:left-5' : 'md:left-[304px]'}
                    right-5 md:right-auto 
                `}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`md:hidden fixed top-3 right-5 z-50 p-2 rounded-full transition-all duration-300 ease-in-out
                    ${sidebarArticle || modalArticleId ? 'hidden' : ''}
                    ${isSidebarCollapsed ? 'bg-gray-800 text-white' : 'bg-white/20 text-white'}
                `}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            <div ref={mainContentRef} className={`flex-1 bg-neutral-50 bg-paper-texture ${!isSidebarCollapsed && isMdUp ? 'md:ml-80' : ''}`}>
                <div className="w-full max-w-3xl mx-auto px-2 md:px-8">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : sidebarArticle ? (
                        <ArticleDetail
                            article={sidebarArticle}
                            onClose={() => setSelectedArticleId(null)}
                        />
                    ) : activeFilter?.type === 'date' ? (
                        <Briefing
                            articleIds={briefingArticleIds || []} // 5. 修改: 传递 IDs
                            timeSlot={timeSlot}
                            selectedReportId={1} // 简化: 只有一个报告
                            onReportSelect={() => { }}
                            onReaderModeRequest={handleOpenFromBriefingCard}
                            onStateChange={handleArticleStateChange}
                            onTimeSlotChange={setTimeSlot}
                            isSidebarCollapsed={isSidebarCollapsed}
                            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            articleCount={briefingArticleIds?.length || 0}
                        />
                    ) : (activeFilter?.type === 'category' || activeFilter?.type === 'tag' || activeFilter?.type === 'search') ? (
                        <ArticleList
                            articleIds={activeFilter.type === 'search' ? (searchResultIds || []) : filteredArticleIds}
                            onOpenArticle={handleOpenFromList}
                            isLoading={isLoading}
                        />
                    ) : (
                        <div className="p-8 text-center text-gray-500">选择一个分类或标签查看文章。</div>
                    )}

                    <FloatingActionButtons
                        selectedArticleId={sidebarArticle?.id || null} // 6. 修改: 传递 ID
                        articleIdsInView={articleIdsInView} // 7. 修改: 传递视图中的 IDs
                        isBriefingFetching={isBriefingFetching}
                        isUpdatingArticle={isUpdatingArticle}
                        isMarkingAsRead={isMarkingAsRead}
                        onArticleStateChange={handleArticleStateChange}
                        onMarkAllClick={handleMarkAllClick}
                        onRefreshToHome={handleRefreshToHome}
                    />

                    {modalArticle && (
                        <UnifiedArticleModal
                            article={modalArticle}
                            onClose={closeModal}
                            onStateChange={handleArticleStateChange}
                            initialMode={modalInitialMode}
                        />
                    )}

                    <Toast
                        message={toast.message}
                        isVisible={toast.isVisible}
                        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                        type={toast.type}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;