'use client';

import React, { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useArticleStore } from '../../store/articleStore';
import ArticleDetailClient from './ArticleDetailClient';
import Briefing from '../../components/Briefing';
import ArticleList from '../../components/ArticleList';
import TrendsView from '../../components/TrendsView';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useBriefingArticles, useFilteredArticles, useSearchResults, useUpdateArticleState } from '../../hooks/useArticles';
import { Article } from '../../types';
import { useRouter } from 'next/navigation';

interface MainContentClientProps {
    initialDate?: string;
    initialHeaderImageUrl?: string;
}

export default function MainContentClient({ initialDate, initialHeaderImageUrl }: MainContentClientProps) {
    const activeFilter = useUIStore(state => state.activeFilter);
    const selectedArticleId = useUIStore(state => state.selectedArticleId);
    const timeSlot = useUIStore(state => state.timeSlot);
    const setTimeSlot = useUIStore(state => state.setTimeSlot);
    const isSidebarCollapsed = useUIStore(state => state.isSidebarCollapsed);
    const toggleSidebar = useUIStore(state => state.toggleSidebar);
    const articlesById = useArticleStore(state => state.articlesById);

    const openModal = useUIStore(state => state.openModal);

    const router = useRouter();
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

    console.log('[MainContentClient] Render:', { initialDate, activeFilter, dateToUse });

    // Hooks must be called unconditionally
    const { data: briefingArticleIds, isLoading: isBriefingLoading } = useBriefingArticles(
        dateToUse || null,
        timeSlot
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
        const article = articlesById[selectedArticleId];
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
            <ArticleList
                articleIds={ids}
                onOpenArticle={handleOpenArticle}
                isLoading={isFilteredLoading}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />
        );
    }

    if (activeFilter?.type === 'search') {
        return (
            <ArticleList
                articleIds={searchResultIds || []}
                onOpenArticle={handleOpenArticle}
                isLoading={isSearchLoading}
            />
        );
    }

    // Default to Briefing (Date View)
    // This handles both explicit date filter AND default initial state
    if (dateToUse) {
        return (
            <Briefing
                articleIds={briefingArticleIds || []}
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
                articleCount={briefingArticleIds?.length || 0}
                isLoading={isBriefingLoading}
            />
        );
    }

    return <LoadingSpinner />;
}
