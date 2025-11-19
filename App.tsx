// App.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import FloatingActionButtons from './components/FloatingActionButtons';
// ----- 1. 修改开始 (移除旧组件，导入新组件) -----
// 移除 BriefingDetailView, ReaderView 导入
import UnifiedArticleModal from './components/UnifiedArticleModal';
// ----- 1. 修改结束 -----
import Sidebar from './components/Sidebar';
import Briefing from './components/Briefing';
import ArticleDetail from './components/ArticleDetail';
import ArticleList from './components/ArticleList';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import { Article, Tag, BriefingReport, GroupedArticles, Filter } from './types';
// ----- 2. 修改开始 (移除 selectBriefingDetailArticle) -----
import { useArticleStore, selectSelectedArticle } from './store/articleStore';
// ----- 2. 修改结束 -----
import { useQueryClient } from '@tanstack/react-query';
import { useFilters } from './hooks/useFilters';
// ----- 3. 修改开始 (移除 useReader) -----
// 移除 useReader 导入
// ----- 3. 修改结束 -----
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

    // ----- 4. 修改开始 (使用新的 modalArticleId) -----
    // 移除 briefingDetailArticleId, briefingDetailArticle 相关逻辑
    const modalArticleId = useArticleStore(state => state.modalArticleId);
    const setModalArticleId = useArticleStore(state => state.setModalArticleId);
    const articlesById = useArticleStore((state) => state.articlesById);
    // 计算当前模态框应该显示的文章对象
    const modalArticle = modalArticleId ? articlesById[modalArticleId] : null;
    // ----- 4. 修改结束 -----

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

    // ----- 5. 修改开始 (统一的打开模态框处理函数) -----
    // 替换原有的 handleOpenArticleListDetail 和 handleOpenArticle
    const handleOpenModal = useCallback((article: Article) => {
        // 无论来源是搜索还是分类，都统一打开模态框
        // 并且默认显示 Briefing (由 UnifiedArticleModal 内部状态控制)
        addArticles([article]); // 确保 store 里有这个文章
        setModalArticleId(article.id);
    }, [addArticles, setModalArticleId]);
    // ----- 5. 修改结束 -----

    // 侧边栏点击逻辑保持不变，仍然是桌面端显示在主区域
    const handleOpenMainDetail = useCallback((article: Article) => {
        setSelectedArticleId(article.id);
        addArticles([article]);
    }, [setSelectedArticleId, addArticles]);

    // ... (useFilters, useBriefingArticles, useFilteredArticles, unreadArticleIdsInView logic unchanged) ...
    
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

    const unreadArticleIdsInView = useMemo(() => {
        const READ_TAG = 'user/-/state/com.google/read';
        let articleIdsToCheck: (string | number)[] = [];

        if (activeFilter?.type === 'date') {
            articleIdsToCheck = briefingArticleIds || [];
        } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
            articleIdsToCheck = filteredArticleIds || [];
        }

        return articleIdsToCheck
            .map(id => articlesById[id])
            .filter(article => article && !article.tags?.includes(READ_TAG))
            .map(article => article.id);
    }, [activeFilter, briefingArticleIds, filteredArticleIds, articlesById]);

    const handleMarkAllClick = () => {
        if (unreadArticleIdsInView.length > 0) {
            markAllAsRead(unreadArticleIdsInView);
        } else {
            showToast('没有需要标记的文章', 'info');
        }
    };

    const reports: BriefingReport[] = useMemo(() => {
        if (!briefingArticleIds || briefingArticleIds.length === 0) return [];
        const articlesForReport = briefingArticleIds.map(id => articlesById[id]).filter(Boolean) as Article[];
        const groupedArticles = articlesForReport.reduce((acc, article) => {
            const group = article.briefingSection || '常规更新';
            if (!acc[group]) acc[group] = [];
            acc[group].push(article);
            return acc;
        }, {} as GroupedArticles);
        return [{ id: 1, title: "Daily Briefing", articles: groupedArticles }];
    }, [briefingArticleIds, articlesById]);

    // ----- 6. 修改开始 (移除 useReader 调用) -----
    // 移除 useReader 相关的所有解构
    // ----- 6. 修改结束 -----

    const sidebarArticle = useArticleStore(selectSelectedArticle);
    // ----- 7. 修改开始 (移除 isReaderVisible) -----
    // const isReaderVisible = useArticleStore(state => state.isReaderVisible);
    // ----- 7. 修改结束 -----

    const { mutateAsync: updateArticleState, isPending: isUpdatingArticle } = useUpdateArticleState();
    const { mutate: markAllAsRead, isPending: isMarkingAsRead } = useMarkAllAsRead();

    const handleArticleStateChange = (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
        return updateArticleState({ articleId, tagsToAdd, tagsToRemove }, {
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

            {/* ----- 8. 修改开始 (更新按钮隐藏逻辑) ----- */}
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
                className={`md:hidden fixed top-5 right-5 z-10 p-2 rounded-full transition-all duration-300 ease-in-out
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
            {/* ----- 8. 修改结束 ----- */}

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
                        reports={reports} 
                        timeSlot={timeSlot}
                        selectedReportId={reports[0]?.id || null}
                        onReportSelect={() => {}}
                        onReaderModeRequest={handleOpenModal} // 简报中的“阅读”按钮现在触发模态框
                        onStateChange={handleArticleStateChange}
                        onTimeSlotChange={setTimeSlot}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        articleCount={briefingArticleIds?.length || 0}
                    />
                ) : (activeFilter?.type === 'category' || activeFilter?.type === 'tag' || activeFilter?.type === 'search') ? (
                    <ArticleList
                        articleIds={activeFilter.type === 'search' ? (searchResultIds || []) : filteredArticleIds}
                        onOpenArticle={handleOpenModal} // 列表点击统一触发模态框
                        isLoading={isLoading}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">选择一个分类或标签查看文章。</div>
                )}
                
                <FloatingActionButtons
                    selectedArticle={sidebarArticle}
                    isBriefingFetching={isBriefingFetching}
                    isUpdatingArticle={isUpdatingArticle}
                    isMarkingAsRead={isMarkingAsRead}
                    hasUnreadInView={unreadArticleIdsInView.length > 0}
                    onArticleStateChange={handleArticleStateChange}
                    onMarkAllClick={handleMarkAllClick}
                    onRefreshToHome={handleRefreshToHome}
                />

                {/* ----- 9. 修改开始 (渲染统一模态框) ----- */}
                {modalArticle && (
                    <UnifiedArticleModal
                        article={modalArticle}
                        onClose={() => setModalArticleId(null)}
                        onStateChange={handleArticleStateChange}
                    />
                )}
                {/* 移除 ReaderView 和 BriefingDetailView 的渲染 */}
                {/* ----- 9. 修改结束 ----- */}

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