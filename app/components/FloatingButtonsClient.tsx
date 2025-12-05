'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FloatingActionButtons from '../../components/FloatingActionButtons';
import { useUIStore } from '../../store/uiStore';
import { useArticleStore } from '../../store/articleStore';
import { useArticleActions } from '../../hooks/useArticleActions';
import { useBriefingArticles, useFilteredArticles, useSearchResults } from '../../hooks/useArticles';
import { useQueryClient } from '@tanstack/react-query';
import { useFilters } from '../../hooks/useFilters';
import { getCurrentTimeSlotInShanghai } from '../../services/api';

export default function FloatingButtonsClient() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Store State
    const activeFilter = useUIStore(state => state.activeFilter);
    const selectedArticleId = useUIStore(state => state.selectedArticleId);
    const setSelectedArticleId = useUIStore(state => state.setSelectedArticleId);
    const setTimeSlot = useUIStore(state => state.setTimeSlot);
    const timeSlot = useUIStore(state => state.timeSlot);
    const { handleResetFilter } = useFilters();

    // Actions
    const {
        handleArticleStateChange,
        handleMarkAllClick,
        isUpdatingArticle,
        isMarkingAsRead
    } = useArticleActions();

    // Data Fetching for articleIdsInView
    const { data: searchResultIds, isLoading: isSearchLoading } = useSearchResults(
        activeFilter?.type === 'search' ? activeFilter.value : null
    );

    const { data: briefingArticleIds, isLoading: isBriefingLoading, isFetching: isBriefingFetching } = useBriefingArticles(
        activeFilter?.type === 'date' ? activeFilter.value : null,
        timeSlot
    );

    const {
        data: filteredArticlesData,
        isLoading: isFilterLoading,
    } = useFilteredArticles(
        (activeFilter?.type === 'category' || activeFilter?.type === 'tag') ? activeFilter.value : null
    );

    const filteredArticleIds = useMemo(() => {
        return filteredArticlesData?.pages.flatMap((page: { articles: (string | number)[] }) => page.articles) || [];
    }, [filteredArticlesData]);

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

    const handleRefreshToHome = async () => {
        setSelectedArticleId(null);
        setTimeSlot(getCurrentTimeSlotInShanghai());
        await queryClient.invalidateQueries({ queryKey: ['briefing'] });
        handleResetFilter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        router.push('/');
    };

    // Wrapper for onArticleStateChange to match expected signature if needed, 
    // but useArticleActions.handleArticleStateChange already matches (id, add, remove)

    return (
        <FloatingActionButtons
            selectedArticleId={selectedArticleId}
            articleIdsInView={articleIdsInView}
            isBriefingFetching={isBriefingFetching}
            isUpdatingArticle={isUpdatingArticle}
            isMarkingAsRead={isMarkingAsRead}
            onArticleStateChange={handleArticleStateChange}
            onMarkAllClick={() => handleMarkAllClick(articleIdsInView)}
            onRefreshToHome={handleRefreshToHome}
        />
    );
}
