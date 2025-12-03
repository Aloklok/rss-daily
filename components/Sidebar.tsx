// components/Sidebar.tsx

import React, { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const activeFilter = useUIStore(state => state.activeFilter);
    const availableFilters = useArticleStore(state => state.availableFilters);
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
    } = useSidebar();

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            setActiveFilter({ type: 'search', value: trimmedQuery });
            setSelectedArticleId(null);
            navigate('/');
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
        navigate('/');
    };

    const handleDateSelect = (date: string) => {
        setActiveFilter({ type: 'date', value: date });
        setSelectedArticleId(null);
        navigate(`/date/${date}`);
    };

    const tabButtonClass = (isActive: boolean) => `flex-1 text-sm font-medium transition-all duration-200 focus:outline-none rounded-md py-2.5 ${isActive ? 'bg-white shadow-sm text-gray-900 dark:bg-midnight-selected dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-midnight-text-secondary dark:hover:text-gray-300'}`;

    return (
        <aside className="flex flex-col flex-shrink-0 bg-gray-50 dark:bg-midnight-sidebar w-full h-full md:w-80 p-4 space-y-6 relative border-r border-gray-200 dark:border-midnight-border">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                    <img src="/computer_cat.jpeg" alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 to-orange-500 leading-tight tracking-tight">
                        Briefing<br />Hub
                    </h1>
                </div>
                <button onClick={handleRefreshClick} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-midnight-card transition-colors disabled:cursor-wait text-gray-500 dark:text-gray-400">
                    <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            <div className="bg-gradient-to-r from-blue-100/80 to-indigo-100/80 dark:bg-midnight-card/50 p-1 rounded-lg flex">
                <button className={tabButtonClass(activeTab === 'filters')} onClick={() => setActiveTab('filters')}>
                    <div className="flex justify-center items-center gap-2"><span>🏷️</span><span>分类</span></div>
                </button>
                <button className={tabButtonClass(activeTab === 'calendar')} onClick={() => setActiveTab('calendar')}>
                    <div className="flex justify-center items-center gap-2"><span>📅</span><span>日历</span></div>
                </button>
            </div>

            <div className="flex-grow overflow-hidden">
                <div className={activeTab === 'filters' ? 'block h-full space-y-4 overflow-y-auto' : 'hidden'}>
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
                                navigate('/');
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
                    navigate('/');
                }}
            />
        </aside>
    );
});

export default memo(Sidebar);
