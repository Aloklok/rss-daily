// components/Sidebar.tsx

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Article, Filter, AvailableFilters } from '../types';
import { useSidebar } from '../hooks/useSidebar';
import { useUIStore } from '../store/uiStore';

// Import extracted components
import SidebarSearch from './sidebar/SidebarSearch';
import SidebarTrends from './sidebar/SidebarTrends';
import SidebarBriefing from './sidebar/SidebarBriefing';
import SidebarStarred from './sidebar/SidebarStarred';
import SidebarExplore from './sidebar/SidebarExplore';
import { Fireflies } from './sidebar/Fireflies';

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

const Sidebar = React.memo<SidebarProps>(({
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
    availableFilters // Destructure
}) => {
    const router = useRouter();
    const activeFilter = useUIStore(state => state.activeFilter);
    // Removed internal store subscription
    const setActiveFilter = useUIStore(state => state.setActiveFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const selectedArticleId = useUIStore(state => state.selectedArticleId);
    const setSelectedArticleId = useUIStore(state => state.setSelectedArticleId);

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
        if (trimmedQuery) {
            setActiveFilter({ type: 'search', value: trimmedQuery });
            setSelectedArticleId(null);
            router.push('/');
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
            router.push(`/?filter=${filter.type}&value=${encodeURIComponent(filter.value)}`);
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

    const tabButtonClass = (isActive: boolean) => `flex-1 text-sm font-medium transition-all duration-200 focus:outline-hidden rounded-md py-2.5 ${isActive ? 'bg-white shadow-xs text-gray-900 dark:bg-midnight-selected dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-white/70 dark:hover:text-white'} cursor-pointer`;

    // Unused settings state removed

    return (
        <aside className="flex flex-col shrink-0 bg-gray-50 dark:bg-midnight-sidebar w-full h-full md:w-80 px-4 pt-4 pb-2 space-y-6 relative border-r border-gray-200 dark:border-midnight-border">
            <Fireflies />
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                    <Image src="/computer_cat_180.jpeg" alt="Logo" width={48} height={48} className="w-12 h-12 rounded-full object-cover shadow-xs" priority />
                    <div className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-500 via-purple-500 via-pink-500 to-orange-500 leading-tight tracking-tight">
                        RSS Briefing<br />Hub
                    </div>
                </div>
                <div className="flex items-center gap-1 relative">
                    <button
                        onClick={handleRefreshClick}
                        disabled={isLoading}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-midnight-card transition-colors disabled:cursor-wait text-gray-500 dark:text-gray-400 cursor-pointer"
                        title="刷新内容"
                        aria-label="刷新内容"
                    >
                        <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582A7.962 7.962 0 0112 4.062a8.002 8.002 0 018 8.002 8.002 8.002 0 01-8 8.002A7.962 7.962 0 014.582 15H4v5" />
                        </svg>
                    </button>
                </div>
            </div>

            {useUIStore(state => state.isAdmin) && (
                <SidebarSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSearch={handleSearchSubmit}
                />
            )}

            <div className="bg-linear-to-r from-blue-100/80 to-indigo-100/80 dark:from-transparent dark:to-transparent dark:bg-transparent p-1 rounded-lg flex">
                <button className={`cursor-pointer ${tabButtonClass(activeTab === 'filters')}`} onClick={() => setActiveTab('filters')}>
                    <div className="flex justify-center items-center gap-2"><span>🏷️</span><span>分类</span></div>
                </button>
                <button className={`cursor-pointer ${tabButtonClass(activeTab === 'calendar')}`} onClick={() => setActiveTab('calendar')}>
                    <div className="flex justify-center items-center gap-2"><span>📅</span><span>日历</span></div>
                </button>
            </div>

            <div className="grow overflow-hidden">
                <div className={activeTab === 'filters' ? 'block h-full space-y-2 overflow-y-auto' : 'hidden'}>
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
                        activeFilter={activeFilter}
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
                        activeFilter={activeFilter}
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
});

Sidebar.displayName = 'Sidebar';

export default memo(Sidebar);
