'use client';

import React, { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Briefing from './BriefingView';
import { Article } from '../../../types';
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

export default function BriefingClient({
  articles,
  date,
  headerImageUrl,
  isToday,
  prevDate,
  nextDate,
}: BriefingClientProps): React.ReactElement {
  const addArticles = useArticleStore((state) => state.addArticles);
  const setActiveFilter = useUIStore((state) => state.setActiveFilter);
  const activeFilter = useUIStore((state) => state.activeFilter);

  // Use global state so FloatingButtonsClient can see the current selection
  const timeSlot = useUIStore((state) => state.timeSlot);
  const setTimeSlot = useUIStore((state) => state.setTimeSlot);
  // Verdict Filter State (Local, as it's specific to this view)
  const [verdictFilter, setVerdictFilter] = React.useState<string | null>(null);

  // Reset global state when date changes (handles client-side soft nav and ensures clean start)
  useEffect(() => {
    setTimeSlot(null);
  }, [date, setTimeSlot]);

  const openModal = useUIStore((state) => state.openModal);

  const { mutateAsync: updateArticleState } = useUpdateArticleState();

  const handleStateChange = async (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => {
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
      queryClient.setQueryData(
        ['briefing', date, 'all'],
        articles.map((a) => a.id),
      );
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
  const initialArticleIds = useMemo(() => articles.map((a) => a.id), [articles]);

  // 1. Always get the "All Day" dataset
  const { data: allDayArticleIds, isLoading } = useBriefingArticles(date, 'all', initialArticleIds);

  // 2. Client-Side Filtering
  const articlesById = useArticleStore((state) => state.articlesById);

  const displayedArticleIds = useMemo(() => {
    // Safe fallback
    const masterIds = allDayArticleIds || initialArticleIds;

    // 1. Filter based on TimeSlot
    let filteredIds = masterIds;

    if (timeSlot) {
      filteredIds = filteredIds.filter((id) => {
        const article = articles.find((a) => a.id === id) || articlesById[id];
        if (!article) return false;
        const dateStr = article.n8n_processing_date || article.published;
        return getArticleTimeSlot(dateStr) === timeSlot;
      });
    }

    // 2. Filter based on Verdict Type
    if (verdictFilter) {
      filteredIds = filteredIds.filter((id) => {
        const article = articles.find((a) => a.id === id) || articlesById[id];
        if (!article) return false;
        // '知识洞察型' | '新闻事件型'
        return article.verdict?.type === verdictFilter;
      });
    }

    return filteredIds;
  }, [timeSlot, verdictFilter, allDayArticleIds, initialArticleIds, articles, articlesById]);

  const articleIds = displayedArticleIds;

  return (
    <Briefing
      articleIds={articleIds}
      date={date}
      headerImageUrl={headerImageUrl}
      timeSlot={timeSlot}
      selectedReportId={1} // Default to 1 as Briefing.tsx hardcodes a single report with ID 1
      onReportSelect={() => {}} // No-op for now
      onReaderModeRequest={(article) => openModal(article.id, 'reader')}
      onStateChange={handleStateChange}
      onTimeSlotChange={setTimeSlot}
      verdictFilter={verdictFilter}
      onVerdictFilterChange={setVerdictFilter}
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
