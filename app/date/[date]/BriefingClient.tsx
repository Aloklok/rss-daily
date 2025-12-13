'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Briefing from '../../../components/Briefing';
import { Article, TimeSlot } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';
import { useUIStore } from '../../../store/uiStore';
import { useUpdateArticleState, useBriefingArticles } from '../../../hooks/useArticles';
import { getArticleTimeSlot } from '../../../utils/dateUtils';

interface BriefingClientProps {
    articles: Article[];
    date: string;
    headerImageUrl?: string;
    isToday: boolean;
    prevDate?: string | null;
    nextDate?: string | null;
}

export default function BriefingClient({ articles, date, headerImageUrl, isToday, prevDate, nextDate }: BriefingClientProps) {
    const addArticles = useArticleStore(state => state.addArticles);
    const setActiveFilter = useUIStore(state => state.setActiveFilter);
    const activeFilter = useUIStore(state => state.activeFilter);

    // Decoupled Local State: Archives always start as "Show All" (null)
    const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);

    // Reset local state when date changes (handles client-side soft nav)
    useEffect(() => {
        setTimeSlot(null);
    }, [date]);

    const openModal = useUIStore(state => state.openModal);
    const isSidebarCollapsed = false; // Default or from store if needed
    // const toggleSidebar = ... // If we want to control sidebar from here

    const { mutateAsync: updateArticleState } = useUpdateArticleState();

    const handleStateChange = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => {
        await updateArticleState({ articleId, tagsToAdd, tagsToRemove });
    };

    // Hydrate store with server-fetched articles
    // AND sync React Query cache with server-fetched IDs.
    const queryClient = useQueryClient();
    useEffect(() => {
        if (articles.length > 0) {
            // 1. Update Zustand (Detailed objects)
            addArticles(articles);

            // 2. Update React Query Cache (ID List)
            queryClient.setQueryData(['briefing', date, 'all'], articles.map(a => a.id));
        }
    }, [articles, addArticles, queryClient, date]);

    // Set active filter to date
    useEffect(() => {
        // Only set if not already set to avoid loops or overrides
        if (activeFilter?.type !== 'date' || activeFilter.value !== date) {
            setActiveFilter({ type: 'date', value: date });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, setActiveFilter]);

    // Use hook to get filtered articles based on timeSlot
    const initialArticleIds = useMemo(() => articles.map(a => a.id), [articles]);

    // 1. Always get the "All Day" dataset
    const { data: allDayArticleIds, isLoading } = useBriefingArticles(date, 'all', initialArticleIds);

    // 2. Client-Side Filtering
    const articlesById = useArticleStore(state => state.articlesById);

    const displayedArticleIds = useMemo(() => {
        // Safe fallback
        const masterIds = allDayArticleIds || initialArticleIds;

        if (!timeSlot) {
            return masterIds;
        }

        // Filter based on the article's n8n_processing_date or published date
        return masterIds.filter((id: string | number) => {
            const article = articles.find(a => a.id === id) || articlesById[id];
            if (!article) return false;
            // Use processing date for alignment with server logic, fallback to published
            const dateStr = article.n8n_processing_date || article.published;
            return getArticleTimeSlot(dateStr) === timeSlot;
        });
    }, [timeSlot, allDayArticleIds, initialArticleIds, articles, articlesById]);

    const articleIds = displayedArticleIds;

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
            isLoading={isLoading}
            articles={articles}
            isToday={isToday}
            prevDate={prevDate}
            nextDate={nextDate}
            disableAutoTimeSlot={true} // Force "Show All" visual state for Archive Pages
        />
    );
}
