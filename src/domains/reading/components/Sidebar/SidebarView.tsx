// components/Sidebar.tsx

import React, { memo, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Article, Filter, AvailableFilters } from '@/types';
import { useSidebar } from '@/domains/reading/hooks/useSidebar';
import { useUIStore } from '@/shared/store/uiStore';

import dynamic from 'next/dynamic';

// Dynamic imports for code splitting
const SidebarSearch = dynamic(() => import('./SidebarSearch'), {
  loading: () => (
    <div className="h-10 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
  ),
  ssr: false, // Admin only tool
});
const SidebarTrends = dynamic(() => import('./SidebarTrends'), {
  loading: () => (
    <div className="h-12 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
  ),
});
const SidebarBriefing = dynamic(() => import('./SidebarBriefing'), {
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
  ),
});
const SidebarStarred = dynamic(() => import('./SidebarStarred'), {
  loading: () => (
    <div className="h-20 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
  ),
});
const SidebarExplore = dynamic(() => import('./SidebarExplore'), {
  loading: () => (
    <div className="h-40 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
  ),
});
// Fireflies is purely decorative and heavy
const Fireflies = dynamic(() => import('./Fireflies').then((mod) => mod.Fireflies), {
  ssr: false,
});

interface SidebarProps {
  isInitialLoading: boolean;
  isRefreshingFilters: boolean;
  availableMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenArticle?: (article: Article) => void;
  onRefresh?: () => Promise<void>;
  datesForMonth: string[];
  dailyStatuses: Record<string, boolean>;
  onToggleDailyStatus: (date: string, currentStatus: boolean) => void;
  initialStarredHeaders?: { id: string | number; title: string; tags: string[] }[];
  availableFilters: AvailableFilters; // Add prop
}

const Sidebar = React.memo<SidebarProps>(
  ({
    isInitialLoading,
    isRefreshingFilters,
    availableMonths,
    selectedMonth,
    onMonthChange,
    onRefresh,
    datesForMonth,
    dailyStatuses,
    onToggleDailyStatus,
    onOpenArticle,
    initialStarredHeaders,
    availableFilters, // Destructure
  }) => {
    const router = useRouter();
    const pathname = usePathname();
    const activeFilter = useUIStore((state) => state.activeFilter);
    // Removed internal store subscription
    const setActiveFilter = useUIStore((state) => state.setActiveFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const selectedArticleId = useUIStore((state) => state.selectedArticleId);
    const setSelectedArticleId = useUIStore((state) => state.setSelectedArticleId);

    // Local state to prevent "flash" of selection during navigation
    const [isNavigatingToSource, setIsNavigatingToSource] = useState(false);

    useEffect(() => {
      if (pathname?.startsWith('/sources') && isNavigatingToSource) {
        // Defer update to avoid "setState in effect" warning
        setTimeout(() => setIsNavigatingToSource(false), 0);
      }
    }, [pathname, isNavigatingToSource]);

    const {
      activeTab,
      setActiveTab,
      starredExpanded,
      toggleStarred,
      starredArticles,
      isLoadingStarred,
      refreshStarred,
      starredCount,
    } = useSidebar({ initialStarredHeaders }); // Pass to hook

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedQuery = searchQuery.trim();
      console.log('Search submit triggered:', trimmedQuery);
      if (trimmedQuery) {
        setActiveFilter({ type: 'search', value: trimmedQuery });
        setSelectedArticleId(null);
        console.log('Navigating to root with params');
        router.push(`/?filter=search&value=${encodeURIComponent(trimmedQuery)}`);
      }
    };

    const isLoading = isInitialLoading || isRefreshingFilters || isLoadingStarred;

    const handleRefreshClick = async () => {
      const refreshFiltersPromise = onRefresh ? onRefresh() : Promise.resolve();
      const refreshStarredPromise = refreshStarred();
      await Promise.all([refreshFiltersPromise, refreshStarredPromise]);
    };

    const handleFilterSelect = (filter: Filter) => {
      setActiveFilter(filter);
      setSelectedArticleId(null);

      if (filter.type === 'category' || filter.type === 'tag') {
        router.push(`/stream/${encodeURIComponent(filter.value)}`);
      } else if (filter.type === 'search') {
        router.push(`/?filter=search&value=${encodeURIComponent(filter.value)}`);
      } else if (filter.type === 'date') {
        router.push(`/date/${filter.value}`);
      } else if (filter.type === 'trends') {
        router.push('/trends');
      } else {
        router.push('/');
      }
    };

    const handleDateSelect = (date: string) => {
      // Don't set activeFilter here. Let navigation handle it.
      // setActiveFilter({ type: 'date', value: date });
      setSelectedArticleId(null);
      router.push(`/date/${date}`);
    };

    const tabButtonClass = (isActive: boolean) =>
      `flex-1 text-sm font-medium transition-all duration-200 focus:outline-hidden rounded-md py-2.5 ${isActive ? 'bg-white shadow-xs text-gray-900 dark:bg-midnight-selected dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-white/70 dark:hover:text-white'} cursor-pointer`;

    // Unused settings state removed

    return (
      <aside className="dark:bg-midnight-sidebar dark:border-midnight-border relative flex h-full w-full shrink-0 flex-col space-y-2 border-r border-gray-200 bg-gray-50 px-4 pt-4 pb-0 md:w-80 md:pb-2">
        <Fireflies />
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <Image
              src="/computer_cat_180.jpeg"
              alt="Logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover shadow-xs"
              priority
            />
            <div className="bg-linear-to-r from-indigo-500 via-pink-500 via-purple-500 to-orange-500 bg-clip-text text-xl leading-tight font-bold tracking-tight text-transparent">
              RSS Briefing
              <br />
              Hub
            </div>
          </div>
          <div className="relative flex items-center gap-1">
            <Link
              href="/archive"
              className="dark:hover:bg-midnight-card flex cursor-pointer items-center justify-center rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400"
              title="查看历史归档"
              aria-label="查看历史归档"
              prefetch={false}
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="sr-only">Archive</span>
            </Link>
            <button
              onClick={handleRefreshClick}
              disabled={isLoading}
              className="dark:hover:bg-midnight-card cursor-pointer rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-wait dark:text-gray-400"
              title="刷新内容"
              aria-label="刷新内容"
            >
              <svg
                className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582A7.962 7.962 0 0112 4.062a8.002 8.002 0 018 8.002 8.002 8.002 0 01-8 8.002A7.962 7.962 0 014.582 15H4v5"
                />
              </svg>
            </button>
          </div>
        </div>

        {useUIStore((state) => state.isAdmin) && (
          <SidebarSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearchSubmit}
          />
        )}

        <div className="px-1">
          <button
            onClick={() => {
              setIsNavigatingToSource(true);
              setActiveFilter(null);
              setSelectedArticleId(null);
              router.push('/sources');
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-all hover:shadow-md active:scale-95 ${
              pathname?.startsWith('/sources')
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800'
                : 'bg-white text-stone-700 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </span>
            <span>按订阅源浏览</span>
          </button>
        </div>

        <div className="flex rounded-lg bg-linear-to-r from-blue-100/80 to-indigo-100/80 p-1 dark:bg-transparent dark:from-transparent dark:to-transparent">
          <button
            className={`cursor-pointer ${tabButtonClass(activeTab === 'filters')}`}
            onClick={() => setActiveTab('filters')}
          >
            <div className="flex items-center justify-center gap-2">
              <span>🏷️</span>
              <span>分类</span>
            </div>
          </button>
          <button
            className={`cursor-pointer ${tabButtonClass(activeTab === 'calendar')}`}
            onClick={() => setActiveTab('calendar')}
          >
            <div className="flex items-center justify-center gap-2">
              <span>📅</span>
              <span>日历</span>
            </div>
          </button>
        </div>

        <div className="grow overflow-hidden">
          <div
            className={
              activeTab === 'filters'
                ? 'scrollbar-stable block h-full space-y-2 overflow-y-auto'
                : 'hidden'
            }
          >
            <SidebarStarred
              isExpanded={starredExpanded}
              onToggle={toggleStarred}
              isLoading={isLoadingStarred}
              articles={starredArticles}
              onArticleClick={(article) => onOpenArticle?.(article)}
              starredCount={starredCount}
              activeFilter={activeFilter}
              selectedArticleId={selectedArticleId}
              onSelect={() => {
                if (activeFilter?.type === 'trends') {
                  setActiveFilter(null);
                  setSelectedArticleId(null);
                  router.push('/');
                }
              }}
            />
            <SidebarExplore
              availableFilters={availableFilters}
              activeFilter={
                pathname?.startsWith('/sources') || isNavigatingToSource ? null : activeFilter
              }
              onFilterSelect={handleFilterSelect}
              selectedArticleId={selectedArticleId}
            />
          </div>
          <div className={activeTab === 'calendar' ? 'block h-full' : 'hidden'}>
            <SidebarBriefing
              isInitialLoading={isInitialLoading}
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
              datesForMonth={datesForMonth}
              dailyStatuses={dailyStatuses}
              onToggleDailyStatus={onToggleDailyStatus}
              activeFilter={
                pathname?.startsWith('/sources') || isNavigatingToSource ? null : activeFilter
              }
              onDateSelect={handleDateSelect}
              selectedArticleId={selectedArticleId}
            />
          </div>
        </div>

        <SidebarTrends
          isActive={activeFilter?.type === 'trends' && !selectedArticleId}
          onClick={() => {
            setActiveFilter({ type: 'trends', value: '' });
            setSelectedArticleId(null);
            router.push('/trends');
          }}
        />
      </aside>
    );
  },
);

Sidebar.displayName = 'Sidebar';

export default memo(Sidebar);
