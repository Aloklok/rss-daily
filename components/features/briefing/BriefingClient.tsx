'use client';

import React, { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Briefing from './BriefingView';
import { Article } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';
import { useUIStore } from '../../../store/uiStore';
import { useUpdateArticleState, useBriefingArticles } from '../../../hooks/useArticles';
import { getArticleTimeSlot } from '../../../utils/dateUtils';
import { getArticleStates } from '../../../services/clientApi';

interface BriefingClientProps {
  articles: Article[];
  date: string;
  headerImageUrl?: string;
  isToday: boolean;
  prevDate?: string | null;
  nextDate?: string | null;
  initialArticleStates?: { [key: string]: string[] };
}

export default function BriefingClient({
  articles,
  date,
  headerImageUrl,
  isToday,
  prevDate,
  nextDate,
  initialArticleStates,
}: BriefingClientProps): React.ReactElement {
  const addArticles = useArticleStore((state) => state.addArticles);
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
      // 1. Prepare Articles with Tags (Merge initialStates if available)
      // This is crucial for fixing the "Ghost Unread" issue and "Slow Loading" of read states
      const mergedArticles = articles.map((a) => {
        // If we have initial states (Server-Side), use them.
        if (initialArticleStates && initialArticleStates[a.id]) {
          return { ...a, tags: initialArticleStates[a.id] };
        }
        return a;
      });

      // 2. Update Zustand (Detailed objects)
      addArticles(mergedArticles);

      // 3. Update React Query Cache (ID List)
      queryClient.setQueryData(
        ['briefing', date, 'all'],
        articles.map((a) => a.id),
      );

      // 4. Client-Side Hydration (If Server-Side data was missing or only partial)
      // Only run client-side fetch if we didn't get initial states (e.g. cached ISR page)
      if (!initialArticleStates || Object.keys(initialArticleStates).length === 0) {
        // Optimization:
        // 1. Increase Batch Size to 50 (Reasonable for HTTP/2 and FreshRSS API)
        // 2. Limit Concurrency to 3 (Prevent browser network congestion)
        const BATCH_SIZE = 50;
        const MAX_CONCURRENT = 3;
        const allIds = articles.map((a) => a.id);

        const fetchBatch = async (ids: (string | number)[]) => {
          try {
            const states = await getArticleStates(ids);
            const articlesWithTags = ids
              .map((id) => {
                const article = articles.find((a) => a.id === id);
                return article ? { ...article, tags: states[id] || [] } : undefined;
              })
              .filter(Boolean) as Article[];

            if (articlesWithTags.length > 0) {
              addArticles(articlesWithTags);
            }
          } catch (err) {
            console.error('Failed to hydrate article states batch:', err);
          }
        };

        // Queue-based Concurrency execution
        const processBatches = async () => {
          const chunks = [];
          for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
            chunks.push(allIds.slice(i, i + BATCH_SIZE));
          }

          const executing: Promise<void>[] = [];
          for (const chunk of chunks) {
            const p = fetchBatch(chunk).then(() => {
              // Remove self from executing list
              executing.splice(executing.indexOf(p), 1);
            });
            executing.push(p);

            if (executing.length >= MAX_CONCURRENT) {
              await Promise.race(executing);
            }
          }
          await Promise.all(executing);
        };

        processBatches();
      }
    }
  }, [articles, addArticles, queryClient, date, initialArticleStates]);

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
      // Only show loading if we are fetching AND we have no articles to show.
      isLoading={isLoading}
      articles={articles}
      isToday={isToday}
      prevDate={prevDate}
      nextDate={nextDate}
    />
  );
}
