'use client';

import React, { useEffect, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useArticleStore } from '../../store/articleStore';
import ArticleDetailClient from '../features/article/ArticleDetailClient';
import Briefing from '../features/briefing/BriefingView';
import SearchList from '../features/search/SearchList';
import StreamList from '../features/stream/StreamView';
import TrendsView from '../features/trends/TrendsPage';
import LoadingSpinner from '../common/ui/Spinner';
import {
  useBriefingArticles,
  useFilteredArticles,
  useSearchResults,
  useUpdateArticleState,
} from '../../hooks/useArticles';
import { Filter, Article, TimeSlot } from '../../types';
import { getArticleTimeSlot } from '@/utils/dateUtils';

import { useQueryClient } from '@tanstack/react-query';
import { useArticleStateHydration } from '../../hooks/useArticleStateHydration';

interface MainContentClientProps {
  initialDate?: string;
  initialHeaderImageUrl?: string;
  initialArticles?: Article[];
  initialActiveFilter?: Filter | null;
  initialContinuation?: string | null;
  isHomepage?: boolean; // New prop
  initialTimeSlot?: TimeSlot | null;
}

export default function MainContentClient({
  initialDate,
  initialHeaderImageUrl,
  initialArticles = [],
  initialActiveFilter,
  initialContinuation,
  isHomepage = false, // Default to false
  initialTimeSlot,
}: MainContentClientProps) {
  const storeActiveFilter = useUIStore((state) => state.activeFilter);
  // Use initial props for SSR/Hydration if store is empty
  const activeFilter = storeActiveFilter || initialActiveFilter;

  const selectedArticleId = useUIStore((state) => state.selectedArticleId);
  const storeTimeSlot = useUIStore((state) => state.timeSlot);

  // Track if component is mounted to differentiate hydration from post-mount user interaction
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use initialTimeSlot fallback ONLY during the initial mount or when store is empty.
  // We prioritize storeTimeSlot but allow initialTimeSlot to bridge the hydration period.
  const timeSlot = storeTimeSlot || (mounted ? null : initialTimeSlot) || null;

  const setTimeSlot = useUIStore((state) => state.setTimeSlot);
  const articlesById = useArticleStore((state) => state.articlesById);

  const openModal = useUIStore((state) => state.openModal);

  const queryClient = useQueryClient();
  const { mutateAsync: updateArticleState } = useUpdateArticleState();

  // Verdict Filter State (Local)
  const [verdictFilter, setVerdictFilter] = React.useState<string | null>(null);

  // Sync initial state (Filter & TimeSlot) to store ONLY ONCE on mount
  useEffect(() => {
    // 1. Sync Active Filter
    const filterState = useUIStore.getState();
    if (initialActiveFilter && !filterState.activeFilter) {
      filterState.setActiveFilter(initialActiveFilter);
    }

    // 2. Sync Time Slot (Homepage only)
    // Get FRESH state because setActiveFilter might have reset timeSlot to null
    const slotState = useUIStore.getState();
    if (isHomepage && initialTimeSlot && !slotState.timeSlot) {
      slotState.setTimeSlot(initialTimeSlot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run strictly once on mount

  // Determine which date to use (active filter or initial default)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  const dateToUse =
    activeFilter?.type === 'date' ? activeFilter.value : activeFilter ? null : initialDate || today;

  // Hydrate store and sync states in background
  // Hydrate store with SSR articles (states already merged in SSR)
  useArticleStateHydration(initialArticles, undefined, dateToUse || undefined);

  // Sync React Query cache with server-fetched IDs
  useEffect(() => {
    if (initialArticles.length > 0) {
      // Update React Query Cache (ID List)
      if (activeFilter?.type === 'date' && dateToUse) {
        // ALWAYS hydrate the 'all' key
        queryClient.setQueryData(
          ['briefing', dateToUse, 'all'],
          initialArticles.map((a) => a.id),
        );

        // Selective Total Hydration: Only hydrate slots that actually have articles from SSR
        if (isHomepage) {
          const slots: TimeSlot[] = ['morning', 'afternoon', 'evening'];
          slots.forEach((slot) => {
            const filteredIds = initialArticles
              .filter((a) => {
                const timeSlotValue = getArticleTimeSlot(a.n8n_processing_date || a.published);
                return timeSlotValue === slot;
              })
              .map((a) => a.id);

            if (filteredIds.length > 0) {
              queryClient.setQueryData(['briefing', dateToUse, slot], filteredIds);
            }
          });
        }
      } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
        if (activeFilter.value) {
          queryClient.setQueryData(['filteredArticles', activeFilter.value], {
            pages: [
              {
                articles: initialArticles.map((a) => a.id),
                continuation: initialContinuation,
              },
            ],
            pageParams: [null],
          });
        }
      }
    }
  }, [initialArticles, queryClient, dateToUse, activeFilter, initialContinuation, isHomepage]);

  // Memoize initial IDs for hook
  const initialArticleIds = useMemo(() => initialArticles.map((a) => a.id), [initialArticles]);

  // Hooks must be called unconditionally
  const { data: briefingArticleIds, isLoading: isBriefingLoading } = useBriefingArticles(
    dateToUse || null,
    timeSlot,
    // CRITICAL: Only seed with all initialArticleIds if timeSlot is null (All View).
    // If a time-slot is selected, we want it to either find its Selective Hydration cache OR fetch from network.
    // Passing initialArticleIds here for a specific slot would incorrectly cache the FULL list for that slot.
    dateToUse === initialDate && !timeSlot ? initialArticleIds : undefined,
  );

  const {
    data: filteredData,
    isLoading: isFilteredLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFilteredArticles(
    activeFilter?.type === 'category' || activeFilter?.type === 'tag' ? activeFilter.value : null,
  );

  const {
    data: searchData,
    isLoading: isSearchLoading,
    fetchNextPage: fetchNextSearchResult,
    hasNextPage: hasNextSearchResult,
    isFetchingNextPage: isFetchingNextSearchResult,
  } = useSearchResults(activeFilter?.type === 'search' ? activeFilter.value : null);

  // Handlers
  const handleOpenArticle = (article: Article) => {
    openModal(article.id);
  };

  const handleReaderModeRequest = (article: Article) => {
    openModal(article.id, 'reader');
  };

  // Memoize initial IDs for hook (moved here to ensure it's available for filteredArticleIds)
  // Note: initialArticleIds is already defined above at line 133, we can reuse it.

  // Filter by Verdict Type Logic (Moved to top level)
  // We need to calculate this based on the active 'effectiveArticleIds' which depends on dateToUse.
  // However, dateToUse is derived. This is fine.

  // Determine effective IDs for Briefing Mode
  const effectiveBriefingIds = useMemo(
    () => briefingArticleIds || (dateToUse === initialDate ? initialArticleIds : []),
    [briefingArticleIds, dateToUse, initialDate, initialArticleIds],
  );

  const filteredBriefingArticleIds = useMemo(() => {
    let filteredIds = effectiveBriefingIds;

    // 1. Filter based on Time Slot (Ensures SSR/Hydration consistency)
    if (timeSlot) {
      filteredIds = filteredIds.filter((id) => {
        // Use String() for safe lookup in both store and initialArticles
        const article =
          articlesById[String(id)] || initialArticles.find((a) => String(a.id) === String(id));
        if (!article) return false;
        // Prefer n8n_processing_date to match API behavior and Selective Hydration logic
        return getArticleTimeSlot(article.n8n_processing_date || article.published) === timeSlot;
      });
    }

    // 2. Filter based on Verdict Type
    if (!verdictFilter) return filteredIds;
    return filteredIds.filter((id) => {
      // Try to find article in store or initial props
      const article =
        articlesById[String(id)] || initialArticles.find((a) => String(a.id) === String(id));
      return article?.verdict?.type === verdictFilter;
    });
  }, [effectiveBriefingIds, timeSlot, verdictFilter, articlesById, initialArticles]);

  // Render Logic
  if (selectedArticleId) {
    const article =
      articlesById[selectedArticleId] || initialArticles.find((a) => a.id === selectedArticleId);
    if (article) {
      return <ArticleDetailClient article={article} />;
    }
  }

  if (activeFilter?.type === 'trends') {
    return <TrendsView />;
  }

  if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
    const ids = filteredData?.pages.flatMap((page) => page.articles) || [];
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
    const ids = searchData?.pages.flatMap((page) => page.articles) || [];
    return (
      <SearchList
        articleIds={ids || []}
        onOpenArticle={handleOpenArticle}
        isLoading={isSearchLoading}
        fetchNextPage={fetchNextSearchResult}
        hasNextPage={hasNextSearchResult}
        isFetchingNextPage={isFetchingNextSearchResult}
      />
    );
  }

  // Default to Briefing (Date View)
  // This handles both explicit date filter AND default initial state
  if (dateToUse) {
    // Use effective IDs: from hook (client) or fallback to initial (SSR)
    // const effectiveArticleIds = ... (Refactored to effectiveBriefingIds above)

    return (
      <Briefing
        articleIds={filteredBriefingArticleIds}
        date={dateToUse}
        headerImageUrl={dateToUse === initialDate ? initialHeaderImageUrl : undefined}
        timeSlot={timeSlot}
        selectedReportId={1}
        onReportSelect={() => {}}
        onReaderModeRequest={handleReaderModeRequest}
        onStateChange={async (id, add, remove) => {
          await updateArticleState({ articleId: id, tagsToAdd: add, tagsToRemove: remove });
        }}
        onTimeSlotChange={setTimeSlot}
        verdictFilter={verdictFilter}
        onVerdictFilterChange={setVerdictFilter}
        articleCount={filteredBriefingArticleIds.length}
        // Only show loading if we really have no content AND are fetching
        // Since SSR always provides initialArticles, this should be false on first render
        isLoading={
          filteredBriefingArticleIds.length === 0 &&
          isBriefingLoading &&
          initialArticles.length === 0
        }
        articles={initialArticles} // Pass initial objects for fallback lookup
        isToday={dateToUse === today}
      />
    );
  }

  return <LoadingSpinner />;
}
