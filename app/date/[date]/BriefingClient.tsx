'use client';

import React, { useEffect } from 'react';
import Briefing from '../../../components/Briefing';
import { Article } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';
import { useUIStore } from '../../../store/uiStore';
import { useUpdateArticleState } from '../../../hooks/useArticles';

interface BriefingClientProps {
    articles: Article[];
    date: string;
}

export default function BriefingClient({ articles, date }: BriefingClientProps) {
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
    }, [date, activeFilter, setActiveFilter]);

    const articleIds = articles.map(a => a.id);

    return (
        <Briefing
            articleIds={articleIds}
            timeSlot={timeSlot}
            selectedReportId={1} // Default to 1 as Briefing.tsx hardcodes a single report with ID 1
            onReportSelect={() => { }} // No-op for now
            onReaderModeRequest={(article) => openModal(article.id, 'reader')}
            onStateChange={handleStateChange}
            onTimeSlotChange={setTimeSlot}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => { }} // No-op or implement if needed
            articleCount={articles.length}
            isLoading={false}
        />
    );
}
