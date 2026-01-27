'use client';

import React, { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './SidebarView';
import { useFilters } from '@/domains/reading/hooks/useFilters';
import { useUIStore } from '@/shared/store/uiStore';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { Article } from '@/types';
import { toShortId } from '@/shared/utils/idHelpers';
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
    // If URL implies a filter, force it.
    // If URL is root or unknow, filter is null, which is also correct for "All" view usually.
    // But we might want to respect "Initial Load" logic if it's complex.
    // For now, if resolved filter is non-null, use it.
    // If activeFilter is already set matching this, setActiveFilter handles dedup internally.
    if (filter) {
      setActiveFilter(filter);
    }
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
