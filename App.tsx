import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FloatingActionButtons from './components/FloatingActionButtons';
import UnifiedArticleModal from './components/UnifiedArticleModal';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import { MainLayout } from './components/MainLayout';
import { MainContent } from './components/MainContent';
import { Filter, Article } from './types';
import { useArticleStore } from './store/articleStore';
import { useUIStore } from './store/uiStore';
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
import { useNavigate, useMatch, useLocation } from 'react-router-dom';
import { useSingleArticle } from './hooks/useSingleArticle';
import { toShortId, toFullId } from './utils/idHelpers';

const App: React.FC = () => {
    // UI State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMdUp, setIsMdUp] = useState<boolean>(false);

    // Routing Hooks
    const navigate = useNavigate();
    const location = useLocation();
    const match = useMatch('/article/:id');
    // const articleIdFromUrl = match?.params.id; // Moved below with decoding

    // Custom Hooks
    const { toast, hideToast } = useAppToast();
    const queryClient = useQueryClient();

    // UI Store State
    const activeFilter = useUIStore(state => state.activeFilter);
    const setActiveFilter = useUIStore(state => state.setActiveFilter);
    // const modalArticleId = useUIStore(state => state.modalArticleId); // Removed in favor of URL
    // const closeModal = useUIStore(state => state.closeModal); // Removed in favor of URL
    // const modalInitialMode = useUIStore(state => state.modalInitialMode); // Removed in favor of URL
    const selectedArticleId = useUIStore(state => state.selectedArticleId);
    const timeSlot = useUIStore(state => state.timeSlot);
    const setTimeSlot = useUIStore(state => state.setTimeSlot);
    const checkAdminStatus = useUIStore(state => state.checkAdminStatus);

    useEffect(() => {
        checkAdminStatus();
    }, [checkAdminStatus]);

    // Article Store State (Data State)
    const setSelectedArticleId = useUIStore(state => state.setSelectedArticleId);
    const articlesById = useArticleStore(state => state.articlesById);
    const addArticles = useArticleStore(state => state.addArticles);

    // Derived State
    // URL-based Modal State
    const searchParams = new URLSearchParams(location.search);
    const viewMode = searchParams.get('view') || 'modal'; // 'modal' (default) or 'page'

    // Date Routing
    // Manual parsing to ensure reliability
    const dateMatch = location.pathname.match(/^\/date\/(\d{4}-\d{2}-\d{2})\/?$/);
    const dateFromUrl = dateMatch ? dateMatch[1] : undefined;

    // Decode first (in case of encoded chars), then convert to full ID
    const rawIdFromUrl = match?.params.id ? decodeURIComponent(match.params.id) : undefined;
    const articleIdFromUrl = rawIdFromUrl ? toFullId(rawIdFromUrl) : undefined;

    // Fetch single article if not in store
    const { data: fetchedArticle } = useSingleArticle(
        articleIdFromUrl && !articlesById[articleIdFromUrl] ? articleIdFromUrl : undefined
    );

    // Modal Article: Only if viewMode is 'modal'
    const modalArticle = (viewMode === 'modal' && articleIdFromUrl)
        ? (articlesById[articleIdFromUrl] || fetchedArticle || null)
        : null;

    // Sidebar Article (Main Content): If viewMode is 'page', use URL article. Otherwise use selectedArticleId.
    const sidebarArticle = (viewMode === 'page' && articleIdFromUrl)
        ? (articlesById[articleIdFromUrl] || fetchedArticle || null)
        : (selectedArticleId ? articlesById[selectedArticleId] : null);

    const modalInitialMode = (searchParams.get('mode') as 'briefing' | 'reader') || 'briefing';

    // Debug logging
    useEffect(() => {
        console.log('App Debug:', {
            pathname: location.pathname,
            dateFromUrl,
            activeFilter,
            sidebarArticle,
            modalArticle
        });
    }, [location.pathname, dateFromUrl, activeFilter, sidebarArticle, modalArticle]);

    // Actions
    const {
        // handleOpenFromList, // Overridden
        // handleOpenFromBriefingCard, // Overridden
        // handleOpenMainDetail, // Overridden
        handleArticleStateChange,
        handleMarkAllClick,
        isUpdatingArticle,
        isMarkingAsRead
    } = useArticleActions();

    // Navigation Handlers
    const handleOpenMainDetail = useCallback((article: Article) => {
        setSelectedArticleId(article.id);
        addArticles([article]);
        navigate(`/article/${toShortId(String(article.id))}`);
    }, [setSelectedArticleId, addArticles, navigate]);

    const handleSidebarArticleClick = useCallback((article: Article) => {
        // Navigate to page view (no modal)
        setSelectedArticleId(article.id);
        addArticles([article]);
        navigate(`/article/${toShortId(String(article.id))}?view=page`);
    }, [setSelectedArticleId, addArticles, navigate]);

    // Navigation Handlers
    const handleOpenFromList = useCallback((article: Article) => {
        addArticles([article]);
        navigate(`/article/${toShortId(String(article.id))}?mode=briefing`);
    }, [navigate, addArticles]);

    const handleOpenFromBriefingCard = useCallback((article: Article) => {
        addArticles([article]);
        navigate(`/article/${toShortId(String(article.id))}?mode=reader`);
    }, [navigate, addArticles]);

    const handleCloseModal = useCallback(() => {
        navigate('/');
    }, [navigate]);

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
        navigate('/'); // Ensure we are at home
    }, [queryClient, setSelectedArticleId, handleResetFilter, setTimeSlot, navigate]);

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
            // window.history.replaceState(null, '', '/'); // Let router handle it
            navigate('/', { replace: true });
        }
    }, [handleResetFilter, navigate]);

    return (
        <MainLayout
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isMdUp={isMdUp}
            showToggleButtons={!modalArticle}
            sidebar={
                <Sidebar
                    isInitialLoading={isInitialLoad}
                    isRefreshingFilters={isRefreshingFilters}
                    availableMonths={availableMonths}
                    selectedMonth={selectedMonth}
                    onMonthChange={onMonthChange}
                    onOpenArticle={handleSidebarArticleClick}
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
                    onClose={handleCloseModal}
                    onStateChange={handleArticleStateChange}
                    initialMode={modalInitialMode}
                />
            )}

            <Toast
                message={toast.message}
                isVisible={toast.isVisible}
                onClose={hideToast}
                type={toast.type}
            />
        </MainLayout>
    );
};

export default App;