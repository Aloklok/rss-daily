'use client';

import React, { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './SidebarView';
import { useFilters } from '@/domains/reading/hooks/useFilters';
import { useUIStore } from '@/shared/store/uiStore';
import { useArticleStore } from '@/domains/article/store/articleStore';
import { Article } from '@/types';
import { toShortId } from '@/domains/article/utils/idHelpers';
import { resolveFilterFromPathname } from '@/shared/utils/url-resolver';

import { Dictionary } from '@/app/i18n/dictionaries';

interface SidebarClientProps {
  initialDates: string[];
  initialAvailableFilters: { tags: any[]; categories: any[] };
  initialStarredHeaders?: { id: string | number; title: string; tags: string[] }[]; // Update type
  dict: Dictionary;
}

export default function SidebarClient({
  initialDates,
  initialAvailableFilters,
  initialStarredHeaders = [],
  dict,
}: SidebarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const setSelectedArticleId = useUIStore((state) => state.setSelectedArticleId);
  const setActiveFilter = useUIStore((state) => state.setActiveFilter);
  const addArticles = useArticleStore((state) => state.addArticles);

  // Sync URL state to Store (handle language switch / refresh)
  React.useEffect(() => {
    const filter = resolveFilterFromPathname(pathname);
    // Always sync store with URL state.
    // If filter is null (e.g. Homepage), we MUST clear the active filter
    // so that the "Today" highlighting logic in SidebarBriefing (which expects !activeFilter) works.
    // However, on Homepage we want to PRESERVE the TimeSlot (morning/evening) if it was set by hydration.
    // So we pass preserveState: true only when filter is null.
    setActiveFilter(filter, !filter);
  }, [pathname, setActiveFilter]);

  const {
    isInitialLoad,
    isRefreshing: isRefreshingFilters,
    datesForMonth,
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    refreshFilters,
    dailyStatuses,
    handleToggleDailyStatus,
    availableFilters,
  } = useFilters({ initialDates, initialAvailableFilters });

  const onMonthChange = useCallback(
    (month: string) => {
      setSelectedMonth(month);
    },
    [setSelectedMonth],
  );

  const handleSidebarArticleClick = useCallback(
    (article: Article) => {
      setSelectedArticleId(article.id);
      addArticles([article]);
      const basePath = dict.lang === 'zh' ? '' : '/en';
      router.push(`${basePath}/article/${toShortId(String(article.id))}?view=page`);
    },
    [setSelectedArticleId, addArticles, router, dict.lang],
  );

  // Mock toggle for now or implement real logic if needed
  const handleToggleDailyStatusWrapper = (date: string, currentStatus: boolean) => {
    handleToggleDailyStatus(date, currentStatus);
  };

  return (
    <div className="sticky top-0 h-full">
      <Sidebar
        isInitialLoading={isInitialLoad}
        isRefreshingFilters={isRefreshingFilters}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        onOpenArticle={handleSidebarArticleClick}
        onRefresh={refreshFilters}
        datesForMonth={datesForMonth}
        dailyStatuses={dailyStatuses}
        onToggleDailyStatus={handleToggleDailyStatusWrapper}
        initialStarredHeaders={initialStarredHeaders}
        availableFilters={availableFilters}
        dict={dict}
      />
    </div>
  );
}
