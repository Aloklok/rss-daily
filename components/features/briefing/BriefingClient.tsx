'use client';

import React, { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Briefing from './BriefingView';
import { Article } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';
import { useUIStore } from '../../../store/uiStore';
import { useUpdateArticleState, useBriefingArticles } from '../../../hooks/useArticles';
import { getArticleTimeSlot } from '../../../utils/dateUtils';

import { useArticleStateHydration } from '../../../hooks/useArticleStateHydration';

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
  const articlesById = useArticleStore((state) => state.articlesById);

  console.log(
    `[DIAG] BriefingClient: props articles=${articles.length}, store articlesById keys=${Object.keys(articlesById).length}`,
  );
  const setActiveFilter = useUIStore((state) => state.setActiveFilter);
  const activeFilter = useUIStore((state) => state.activeFilter);

  // Use global state so FloatingButtonsClient can see the current selection
  const timeSlot = useUIStore((state) => state.timeSlot);
  const setTimeSlot = useUIStore((state) => state.setTimeSlot);
  // Verdict Filter State (Global)
  const verdictFilter = useUIStore((state) => state.verdictFilter);
  const setVerdictFilter = useUIStore((state) => state.setVerdictFilter);

  // Reset global state when date changes (handles client-side soft nav and ensures clean start)
  useEffect(() => {
    setTimeSlot(null);
    setVerdictFilter(null);
  }, [date, setTimeSlot, setVerdictFilter]);

  const openModal = useUIStore((state) => state.openModal);

  const { mutateAsync: updateArticleState } = useUpdateArticleState();
  const queryClient = useQueryClient();

  const handleStateChange = async (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => {
    await updateArticleState({ articleId, tagsToAdd, tagsToRemove });
  };

  // Hydrate store with SSR articles (states already merged in SSR)
  useArticleStateHydration(articles, undefined, date);

  // Sync React Query cache with server-fetched IDs.
  useEffect(() => {
    if (articles.length > 0) {
      queryClient.setQueryData(
        ['briefing', date, 'all'],
        articles.map((a) => a.id),
      );
    }
  }, [articles, queryClient, date]);

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

  // 1. Optimized Fetch Logic:
  // - If we already have articles (SSR hydrated), we stick to 'all' and filter locally to avoid unnecessary network requests.
  // - If articles are empty (e.g. Test environment without SSR data, or empty state), we try fetching specific slot to force a check.
  const shouldUseSpecificSlot = articles.length === 0 && !!timeSlot;
  const querySlot = shouldUseSpecificSlot ? timeSlot : 'all';

  const { data: fetchedArticleIds, isLoading } = useBriefingArticles(
    date,
    querySlot,
    initialArticleIds,
  );

  // 2. Client-Side Filtering

  const displayedArticleIds = useMemo(() => {
    // If we fetched a specific slot (e.g. evening), use that.
    // If we fetched 'all', use that. Fallback to initial.
    const masterIds = fetchedArticleIds || initialArticleIds;
    if (!masterIds || masterIds.length === 0) return [];

    let filteredIds = masterIds;

    // 1. Filter based on Time Slot
    if (timeSlot) {
      filteredIds = filteredIds.filter((id) => {
        const article =
          articles.find((a) => String(a.id) === String(id)) || articlesById[String(id)];
        if (!article) return true; // Keep it if we are still loading detail, avoid "disappearing" act
        const dateStr = article.n8n_processing_date || article.published;
        return getArticleTimeSlot(dateStr) === timeSlot;
      });
    }

    // 2. Filter based on Verdict Type
    if (verdictFilter) {
      filteredIds = filteredIds.filter((id) => {
        const article =
          articles.find((a) => String(a.id) === String(id)) || articlesById[String(id)];
        if (!article) return true;
        const type = article.verdict?.type;
        return type === verdictFilter;
      });
    }

    return filteredIds;
  }, [timeSlot, verdictFilter, fetchedArticleIds, initialArticleIds, articles, articlesById]);

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
      // Only show loading if we are fetching AND we have no SSR articles to show.
      // This prevents Hydration Mismatch - SSR always has articles, so isLoading should be false.
      isLoading={isLoading && articles.length === 0}
      articles={articles}
      isToday={isToday}
      prevDate={prevDate}
      nextDate={nextDate}
    />
  );
}
