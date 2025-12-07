'use client';

import React, { useEffect, useMemo } from 'react';
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
    useEffect(() => {
        if (articles.length > 0) {
            addArticles(articles);
        }
    }, [articles, addArticles]);

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
    const { data: briefingArticleIds, isLoading } = useBriefingArticles(date, timeSlot);

    // Fallback to props.articles if hook returns nothing (e.g. initial load before effect)
    // But since we hydrated, maybe we can just use the hook result?
    // If timeSlot is null, the hook returns all articles (if configured correctly).
    // Let's rely on the hook for consistency.
    // Use initial articles for SSR/first render if hook data is not yet available
    const initialArticleIds = useMemo(() => articles.map(a => a.id), [articles]);
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
            isLoading={isLoading}
            articles={articles}
            isToday={isToday}
        />
    );
}
