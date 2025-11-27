import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FloatingActionButtons from './components/FloatingActionButtons';
import UnifiedArticleModal from './components/UnifiedArticleModal';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import { MainLayout } from './components/MainLayout';
import { MainContent } from './components/MainContent';
import { Filter } from './types';
import { useArticleStore, selectSelectedArticle } from './store/articleStore';
import { useQueryClient } from '@tanstack/react-query';
import { useFilters } from './hooks/useFilters';
import { getCurrentTimeSlotInShanghai } from './services/api';
import {
    useBriefingArticles,
    useFilteredArticles,
    useSearchResults
} from './hooks/useArticles';
import { useAppToast } from './hooks/useAppToast';
import { useArticleActions } from './hooks/useArticleActions';

const App: React.FC = () => {
    // UI State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);

    // Custom Hooks
    const { toast, showToast } = useAppToast();
    const queryClient = useQueryClient();

    // Store State
    const modalArticleId = useArticleStore(state => state.modalArticleId);
    const modalInitialMode = useArticleStore(state => state.modalInitialMode);
    const closeModal = useArticleStore(state => state.closeModal);
    const activeFilter = useArticleStore(state => state.activeFilter);
    const timeSlot = useArticleStore(state => state.timeSlot);
    const setTimeSlot = useArticleStore(state => state.setTimeSlot);
    const setSelectedArticleId = useArticleStore(state => state.setSelectedArticleId);
    const sidebarArticle = useArticleStore(selectSelectedArticle);

    // Derived State
    const modalArticle = useArticleStore(state =>
        state.modalArticleId ? state.articlesById[state.modalArticleId] : null
    );

    // Actions
    const {
        handleOpenFromList,
        handleOpenFromBriefingCard,
        handleOpenMainDetail,
        handleArticleStateChange,
        handleMarkAllClick,
        isUpdatingArticle,
        isMarkingAsRead
    } = useArticleActions(showToast);

    // Data Fetching
    const { data: searchResultIds, isLoading: isSearchLoading } = useSearchResults(
        activeFilter?.type === 'search' ? activeFilter.value : null
    );

    const {
        isInitialLoad,
        isRefreshing: isRefreshingFilters,
        datesForMonth,
        availableMonths,
        selectedMonth,
        setSelectedMonth,
        handleResetFilter,
        refreshFilters,
        dailyStatuses,
        handleToggleDailyStatus,
    } = useFilters();

    const { data: briefingArticleIds, isLoading: isBriefingLoading, isFetching: isBriefingFetching } = useBriefingArticles(
        activeFilter?.type === 'date' ? activeFilter.value : null,
        timeSlot
    );

    const {
        data: filteredArticlesData,
        isLoading: isFilterLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useFilteredArticles(
        (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? activeFilter.value : null
    );

    const filteredArticleIds = useMemo(() => {
        return filteredArticlesData?.pages.flatMap((page: { articles: (string | number)[] }) => page.articles) || [];
    }, [filteredArticlesData]);

    // Computed
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

    const isLoading = isInitialLoad || isBriefingLoading || isFilterLoading || isBriefingFetching || isSearchLoading;

    // Handlers
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

    // Effects
    useEffect(() => {
        const updateViewport = () => {
            setIsSidebarCollapsed(window.innerWidth < 768);
            setIsMdUp(window.innerWidth >= 768);
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    useEffect(() => {
        if (window.location.pathname === '/now') {
            handleResetFilter();
            window.history.replaceState(null, '', '/');
        }
    }, [handleResetFilter]);

    return (
        <MainLayout
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isMdUp={isMdUp}
            showToggleButtons={!modalArticleId && !(activeFilter?.type === 'date' && !isMdUp) && !sidebarArticle}
            sidebar={
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
            }
        >
            <MainContent
                isLoading={isLoading}
                sidebarArticle={sidebarArticle}
                activeFilter={activeFilter}
                briefingArticleIds={briefingArticleIds || []}
                searchResultIds={searchResultIds || []}
                filteredArticleIds={filteredArticleIds}
                timeSlot={timeSlot}
                isSidebarCollapsed={isSidebarCollapsed}
                onCloseArticle={() => setSelectedArticleId(null)}
                onOpenFromBriefingCard={handleOpenFromBriefingCard}
                onStateChange={handleArticleStateChange}
                onTimeSlotChange={setTimeSlot}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onOpenFromList={handleOpenFromList}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />

            <FloatingActionButtons
                selectedArticleId={sidebarArticle?.id || null}
                articleIdsInView={articleIdsInView}
                isBriefingFetching={isBriefingFetching}
                isUpdatingArticle={isUpdatingArticle}
                isMarkingAsRead={isMarkingAsRead}
                onArticleStateChange={handleArticleStateChange}
                onMarkAllClick={() => handleMarkAllClick(articleIdsInView)}
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
                onClose={() => showToast('', 'info')} // Close just hides it
                type={toast.type}
            />
        </MainLayout>
    );
};

export default App;