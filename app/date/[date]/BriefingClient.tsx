'use client';

import React, { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Briefing from '../../../components/Briefing';
import { Article } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';
import { useUIStore } from '../../../store/uiStore';
import { useUpdateArticleState, useBriefingArticles } from '../../../hooks/useArticles';

interface BriefingClientProps {
    articles: Article[];
    date: string;
    headerImageUrl?: string;
    isToday: boolean;
}

export default function BriefingClient({ articles, date, headerImageUrl, isToday }: BriefingClientProps) {
    const addArticles = useArticleStore(state => state.addArticles);
    const setActiveFilter = useUIStore(state => state.setActiveFilter);
    const activeFilter = useUIStore(state => state.activeFilter);
    const timeSlot = useUIStore(state => state.timeSlot);
    const setTimeSlot = useUIStore(state => state.setTimeSlot);
    const openModal = useUIStore(state => state.openModal);
    const isSidebarCollapsed = false; // Default or from store if needed
    // const toggleSidebar = ... // If we want to control sidebar from here

    const { mutateAsync: updateArticleState } = useUpdateArticleState();

    const handleStateChange = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
        await updateArticleState({ articleId, tagsToAdd, tagsToRemove });
    };

    // Hydrate store with server-fetched articles
    // AND sync React Query cache with server-fetched IDs.
    // This is crucial for "Today" (SSR/Real-time) to ensure that if the server sent fresh data,
    // we use it immediately, updating the cache even if it wasn't strictly "stale" by client timer.
    const queryClient = useQueryClient();
    useEffect(() => {
        if (articles.length > 0) {
            // 1. Update Zustand (Detailed objects)
            addArticles(articles);

            // 2. Update React Query Cache (ID List)
            // We use standard setQueryData to ensure the hook sees this as the latest "success" data.
            queryClient.setQueryData(['briefing', date, timeSlot || 'all'], articles.map(a => a.id));
        }
    }, [articles, addArticles, queryClient, date, timeSlot]);

    // Set active filter to date
    useEffect(() => {
        // Only set if not already set to avoid loops or overrides
        if (activeFilter?.type !== 'date' || activeFilter.value !== date) {
            setActiveFilter({ type: 'date', value: date });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, setActiveFilter]);

    // Use hook to get filtered articles based on timeSlot
    // We use props.articles as initial data if timeSlot is null (All Day)
    // But actually, useBriefingArticles handles fetching.
    // Since we hydrated the store, we just need the IDs.
    // Use hook to get filtered articles based on timeSlot
    // We use props.articles as initial data if timeSlot is null (All Day)
    // But actually, useBriefingArticles handles fetching.
    // Since we hydrated the store, we just need the IDs.
    const initialArticleIds = useMemo(() => articles.map(a => a.id), [articles]);

    // Pass initialData to hook to prevent loading state on SSR even if empty
    const { data: briefingArticleIds, isLoading } = useBriefingArticles(date, timeSlot, initialArticleIds);

    // Fallback to props.articles if hook returns nothing (e.g. initial load before effect)
    // But since we hydrated, maybe we can just use the hook result?
    // If timeSlot is null, the hook returns all articles (if configured correctly).
    // Let's rely on the hook for consistency.
    // Use initial articles for SSR/first render if hook data is not yet available

    const articleIds = briefingArticleIds || initialArticleIds;

    return (
        <Briefing
            articleIds={articleIds}
            date={date}
            headerImageUrl={headerImageUrl}
            timeSlot={timeSlot}
            selectedReportId={1} // Default to 1 as Briefing.tsx hardcodes a single report with ID 1
            onReportSelect={() => { }} // No-op for now
            onReaderModeRequest={(article) => openModal(article.id, 'reader')}
            onStateChange={handleStateChange}
            onTimeSlotChange={setTimeSlot}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => { }} // No-op or implement if needed
            articleCount={articleIds.length}
            // Only show loading if we are fetching AND we have no articles to show.
            // This ensures SSR content (articles passed via props) is rendered immediately.
            isLoading={isLoading}
            articles={articles}
            isToday={isToday}
        />
    );
}
