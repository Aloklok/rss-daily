'use client';

import React, { useEffect, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useArticleStore } from '../../store/articleStore';
import ArticleDetailClient from './ArticleDetailClient';
import Briefing from '../../components/Briefing';
import SearchList from '../../components/SearchList';
import StreamList from '../../components/StreamList';
import TrendsView from '../../components/TrendsView';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useBriefingArticles, useFilteredArticles, useSearchResults, useUpdateArticleState } from '../../hooks/useArticles';
import { Filter, Article } from '../../types';

import { useQueryClient } from '@tanstack/react-query';

interface MainContentClientProps {
    initialDate?: string;
    initialHeaderImageUrl?: string;
    initialArticles?: Article[];
    initialActiveFilter?: Filter | null;
    initialContinuation?: string | null;
}

export default function MainContentClient({
    initialDate,
    initialHeaderImageUrl,
    initialArticles = [],
    initialActiveFilter,
    initialContinuation
}: MainContentClientProps) {
    const storeActiveFilter = useUIStore(state => state.activeFilter);
    // Use initial props for SSR/Hydration if store is empty
    const activeFilter = storeActiveFilter || initialActiveFilter;

    // Sync prop to store after mount
    useEffect(() => {
        if (initialActiveFilter && !storeActiveFilter) {
            useUIStore.getState().setActiveFilter(initialActiveFilter);
        }
    }, [initialActiveFilter, storeActiveFilter]);

    const selectedArticleId = useUIStore(state => state.selectedArticleId);
    const timeSlot = useUIStore(state => state.timeSlot);
    const setTimeSlot = useUIStore(state => state.setTimeSlot);
    const isSidebarCollapsed = useUIStore(state => state.isSidebarCollapsed);
    const toggleSidebar = useUIStore(state => state.toggleSidebar);
    const articlesById = useArticleStore(state => state.articlesById);
    const addArticles = useArticleStore(state => state.addArticles);

    const openModal = useUIStore(state => state.openModal);



    const queryClient = useQueryClient();
    const { mutateAsync: updateArticleState } = useUpdateArticleState();

    // Initialize timeSlot if not set (e.g. first load)
    useEffect(() => {
        if (!timeSlot && activeFilter?.type === 'date') {
            const hour = new Date().getHours();
            let currentSlot: 'morning' | 'afternoon' | 'evening' = 'morning';
            if (hour >= 12 && hour < 19) currentSlot = 'afternoon';
            if (hour >= 19) currentSlot = 'evening';
            setTimeSlot(currentSlot);
        }
    }, [timeSlot, activeFilter, setTimeSlot]);

    // Determine which date to use (active filter or initial default)
    // Fallback to today if initialDate is missing (prevents missing header)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const dateToUse = activeFilter?.type === 'date' ? activeFilter.value : (activeFilter ? null : (initialDate || today));

    // Hydrate store with server-fetched articles (SSR -> Client Handover)
    useEffect(() => {
        if (initialArticles.length > 0) {
            // 1. Update Zustand (Detailed objects)
            addArticles(initialArticles);

            // 2. Update React Query Cache (ID List)
            if (activeFilter?.type === 'date' && dateToUse) {
                queryClient.setQueryData(['briefing', dateToUse, 'all'], initialArticles.map(a => a.id));
            } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
                // Pre-populate useFilteredArticles cache?
                // React Query key needed.
                // Key: ['filteredArticles', filterValue]
                if (activeFilter.value) {
                    // We need to match the structure expected by useFilteredArticles
                    // It expects InfiniteData<{ articles: number[], continuation: string | null }>
                    queryClient.setQueryData(['filteredArticles', activeFilter.value], {
                        pages: [{
                            articles: initialArticles.map(a => a.id),
                            continuation: initialContinuation
                        }],
                        pageParams: [null]
                    });
                }
            }
        }
    }, [initialArticles, addArticles, queryClient, dateToUse, activeFilter, initialContinuation]);

    // Memoize initial IDs for hook
    const initialArticleIds = useMemo(() => initialArticles.map(a => a.id), [initialArticles]);

    // Hooks must be called unconditionally
    const { data: briefingArticleIds, isLoading: isBriefingLoading } = useBriefingArticles(
        dateToUse || null,
        timeSlot,
        // Pass initial data only if matching the SSR date
        (dateToUse === initialDate) ? initialArticleIds : undefined
    );

    const {
        data: filteredData,
        isLoading: isFilteredLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useFilteredArticles(
        (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? activeFilter.value : null
    );

    const { data: searchResultIds, isLoading: isSearchLoading } = useSearchResults(
        activeFilter?.type === 'search' ? activeFilter.value : null
    );

    // Handlers
    const handleOpenArticle = (article: Article) => {
        openModal(article.id);
    };

    const handleReaderModeRequest = (article: Article) => {
        openModal(article.id, 'reader');
    };

    // Render Logic
    if (selectedArticleId) {
        const article = articlesById[selectedArticleId] || initialArticles.find(a => a.id === selectedArticleId);
        if (article) {
            return <ArticleDetailClient article={article} />;
        }
    }

    if (activeFilter?.type === 'trends') {
        return <TrendsView />;
    }

    if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
        const ids = filteredData?.pages.flatMap(page => page.articles) || [];
        return (
            <StreamList
                articleIds={ids}
                isLoading={isFilteredLoading}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />
        );
    }

    if (activeFilter?.type === 'search') {
        return (
            <SearchList
                articleIds={searchResultIds || []}
                onOpenArticle={handleOpenArticle}
                isLoading={isSearchLoading}
            />
        );
    }

    // Default to Briefing (Date View)
    // This handles both explicit date filter AND default initial state
    if (dateToUse) {
        // Use effective IDs: from hook (client) or fallback to initial (SSR)
        const effectiveArticleIds = briefingArticleIds || (dateToUse === initialDate ? initialArticleIds : []);

        return (
            <Briefing
                articleIds={effectiveArticleIds}
                date={dateToUse}
                headerImageUrl={dateToUse === initialDate ? initialHeaderImageUrl : undefined}
                timeSlot={timeSlot}
                selectedReportId={1}
                onReportSelect={() => { }}
                onReaderModeRequest={handleReaderModeRequest}
                onStateChange={async (id, add, remove) => { await updateArticleState({ articleId: id, tagsToAdd: add, tagsToRemove: remove }); }}
                onTimeSlotChange={setTimeSlot}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                articleCount={effectiveArticleIds.length}
                // Only show loading if we really have no content AND are fetching (and client is mounted)
                // This prevents infinite spinner in No-JS if SSR failed
                isLoading={effectiveArticleIds.length === 0 && isBriefingLoading && typeof window !== 'undefined'}
                articles={initialArticles} // Pass initial objects for fallback lookup
                isToday={dateToUse === today}
            />
        );
    }

    return <LoadingSpinner />;
}
