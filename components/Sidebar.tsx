// components/Sidebar.tsx

import React, { memo, useState } from 'react';
import { Article, Filter } from '../types';
import { useSidebar } from '../hooks/useSidebar';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';

// Import extracted components
import SidebarSearch from './sidebar/SidebarSearch';
import SidebarTrends from './sidebar/SidebarTrends';
import SidebarBriefing from './sidebar/SidebarBriefing';
import SidebarStarred from './sidebar/SidebarStarred';
import SidebarExplore from './sidebar/SidebarExplore';

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
    onOpenArticle
}) => {
    const activeFilter = useUIStore(state => state.activeFilter);
    const availableFilters = useArticleStore(state => state.availableFilters);
    const setActiveFilter = useUIStore(state => state.setActiveFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const selectedArticleId = useUIStore(state => state.selectedArticleId);

    const {
        activeTab,
        setActiveTab,
        starredExpanded,
        toggleStarred,
        starredArticles,
        isLoadingStarred,
        refreshStarred,
        starredCount,
    } = useSidebar();

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            setActiveFilter({ type: 'search', value: trimmedQuery });
        }
    };

    const isLoading = isInitialLoading || isRefreshingFilters || isLoadingStarred;

    const handleRefreshClick = async () => {
        const refreshFiltersPromise = onRefresh ? onRefresh() : Promise.resolve();
        const refreshStarredPromise = refreshStarred();
        await Promise.all([refreshFiltersPromise, refreshStarredPromise]);
    };

    const tabButtonClass = (isActive: boolean) => `text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 rounded-md py-2 ${isActive ? 'bg-white shadow-sm text-gray-900 dark:bg-midnight-selected dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-midnight-text-secondary dark:hover:bg-midnight-card'}`;

    return (
        <aside className="flex flex-col flex-shrink-0 bg-gray-50/90 dark:bg-midnight-sidebar/95 backdrop-blur-md border-r border-gray-200 dark:border-midnight-border w-full h-full md:w-80 p-4 space-y-4 relative">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src="/computer_cat.jpeg" alt="Logo" className="w-20 h-20 rounded-full object-cover" />
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 to-orange-500 pr-1 leading-tight">
                        Briefing<br />Hub
                    </h1>
                </div>
                <button onClick={handleRefreshClick} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-200 transition-colors disabled:cursor-wait">
                    <svg className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582A7.962 7.962 0 0112 4.062a8.002 8.002 0 018 8.002 8.002 8.002 0 01-8 8.002A7.962 7.962 0 014.582 15H4v5" />
                    </svg>
                </button>
            </div>

            {useUIStore(state => state.isAdmin) && (
                <SidebarSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSearch={handleSearchSubmit}
                />
            )}

            <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-midnight-card rounded-lg">
                <button className={`flex-1 ${tabButtonClass(activeTab === 'filters')}`} onClick={() => setActiveTab('filters')}>
                    <div className="flex justify-center items-center gap-2"><span>🏷️</span><span>分类</span></div>
                </button>
                <button className={`flex-1 ${tabButtonClass(activeTab === 'calendar')}`} onClick={() => setActiveTab('calendar')}>
                    <div className="flex justify-center items-center gap-2"><span>📅</span><span>日历</span></div>
                </button>
            </div>

            <div className="flex-grow overflow-y-scroll">
                <div className={activeTab === 'filters' ? 'block h-full space-y-4' : 'hidden'}>
                    <SidebarStarred
                        isExpanded={starredExpanded}
                        onToggle={toggleStarred}
                        isLoading={isLoadingStarred}
                        articles={starredArticles}
                        onArticleClick={(article) => onOpenArticle?.(article)}
                        starredCount={starredCount}
                        activeFilter={activeFilter}
                        selectedArticleId={selectedArticleId}
                        onSelect={() => setActiveFilter({ type: 'starred', value: '' })}
                    />
                    <SidebarExplore
                        availableFilters={availableFilters}
                        activeFilter={activeFilter}
                        onFilterSelect={setActiveFilter}
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
                        onDateSelect={(date) => setActiveFilter({ type: 'date', value: date })}
                        selectedArticleId={selectedArticleId}
                    />
                </div>
            </div>

            <SidebarTrends
                isActive={activeFilter?.type === 'trends' && !selectedArticleId}
                onClick={() => setActiveFilter({ type: 'trends', value: '' })}
            />
        </aside>
    );
});

export default memo(Sidebar);