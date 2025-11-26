// components/Sidebar.tsx

import React, { memo, useState } from 'react';
import { Article, Filter, AvailableFilters } from '../types';
import { useSidebar, ActiveTab } from '../hooks/useSidebar';
import { useArticleStore } from '../store/articleStore';
import TechRadarLink from './TechRadarLink';
import GitHubTrendingLink from './GitHubTrendingLink';
import NotebookLMLink from './NotebookLMLink';
import ExternalLinks from './ExternalLinks';


const StatusIcon: React.FC<{ completed: boolean; onClick: (e: React.MouseEvent) => void }> = ({ completed, onClick }) => {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(e);
    };

    // 基础样式，用于尺寸和对齐
    const baseClasses = "h-5 w-5 cursor-pointer transition-all duration-200 ease-in-out transform group-hover:scale-110";

    if (completed) {
        // 已完成状态：绿色的实心圆圈背景和白色的对勾
        return (
            <div onClick={handleClick} className="relative">
                <svg className={`${baseClasses} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            </div>
        );
    }

    // 未完成状态：灰色的空心圆圈
    return (
        <div onClick={handleClick} className="relative">
            <svg className={`${baseClasses} text-gray-300 group-hover:text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
            </svg>
        </div>
    );
};

interface SidebarProps {
    isInitialLoading: boolean; // 初始加载状态
    isRefreshingFilters: boolean; // 过滤器刷新状态
    availableMonths: string[];
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    onOpenArticle?: (article: Article) => void;
    onRefresh?: () => Promise<void>;
    datesForMonth: string[];
    dailyStatuses: Record<string, boolean>;
    onToggleDailyStatus: (date: string, currentStatus: boolean) => void;
}

const formatMonthForDisplay = (month: string) => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
};


// 【增】定义一个新的组件，用于渲染状态图标



const Sidebar = React.memo<SidebarProps>(({
    isInitialLoading,
    isRefreshingFilters,
    availableMonths,
    selectedMonth,
    onMonthChange,
    onRefresh,
    datesForMonth,
    dailyStatuses, // 【增】
    onToggleDailyStatus, // 【增】
    onOpenArticle
}) => {
    const activeFilter = useArticleStore(state => state.activeFilter);
    // 2. 【增加】在这里从 Zustand store 中直接获取 availableFilters
    const availableFilters = useArticleStore(state => state.availableFilters);
    const setActiveFilter = useArticleStore(state => state.setActiveFilter);
    const [searchQuery, setSearchQuery] = useState(''); // 2. 【增加】搜索框的本地状态
    const selectedArticleId = useArticleStore(state => state.selectedArticleId);
    const setSelectedArticleId = useArticleStore(state => state.setSelectedArticleId);
    const {
        activeTab,
        setActiveTab,
        starredExpanded,
        toggleStarred,
        starredArticles,
        isLoadingStarred, // 这个状态来自 useSidebar，包含了 isFetching
        refreshStarred,
        starredCount,
    } = useSidebar();

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            setActiveFilter({ type: 'search', value: trimmedQuery });
            // 可以在这里增加逻辑，如果用户在移动端，则自动收起侧边栏
        }
    };
    // 1. 【核心修改】为“分类”添加折叠状态
    const [categoriesExpanded, setCategoriesExpanded] = useState(false);

    // 【核心修复】组合所有加载状态
    const isLoading = isInitialLoading || isRefreshingFilters || isLoadingStarred;

    const isFilterActive = (type: Filter['type'], value: string) => {
        return !selectedArticleId && activeFilter?.type === type && activeFilter?.value === value;
    };

    const handleRefreshClick = async () => {
        // 并行触发两个刷新操作
        const refreshFiltersPromise = onRefresh ? onRefresh() : Promise.resolve();
        const refreshStarredPromise = refreshStarred();
        await Promise.all([refreshFiltersPromise, refreshStarredPromise]);
    };

    // ... (其他 UI 渲染函数 chipButtonClass, listItemButtonClass 等保持不变)
    const chipButtonClass = (isActive: boolean) => `flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isActive ? 'bg-gray-800 text-white border-gray-800 font-semibold' : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-200'}`;
    const listItemButtonClass = (isActive: boolean) => `w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 text-gray-700 ${isActive ? 'bg-gray-800 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'}`;
    const tabButtonClass = (isActive: boolean) => `text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 rounded-md py-2 ${isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`;



    const renderFiltersTab = () => (
        <div className="space-y-1">
            {/* 我的收藏 */}
            <nav className="flex flex-col">
                <button onClick={toggleStarred} className={listItemButtonClass(isFilterActive('starred', 'true'))}>
                    <span>⭐</span>
                    <span className="flex-1">我的收藏</span>
                    {starredCount > 0 && (
                        // 1. 【修改】统一使用更柔和的指示器样式
                        <span className="text-xs font-medium bg-gray-200 text-gray-600 rounded-full h-5 w-5 flex items-center justify-center">
                            {starredCount}
                        </span>
                    )}
                    <svg className={`h-4 w-4 transition-transform ${starredExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {starredExpanded && (
                    <div className="mt-2 ml-4 pl-3 border-l border-gray-200 space-y-1">
                        {isLoadingStarred && starredArticles.length === 0 ? (
                            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>)}</div>
                        ) : (
                            starredArticles.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">暂无收藏</div>
                            ) : (
                                starredArticles.map(article => (
                                    <button key={article.id} onClick={() => onOpenArticle(article as Article)}
                                        className={listItemButtonClass(selectedArticleId === article.id)}>
                                        <span className="truncate">{article.title}</span>
                                    </button>
                                ))
                            )
                        )}
                    </div>
                )}
            </nav>

            {/* 分类 */}
            <nav className="flex flex-col">
                {/* 2. 【修改】移除 font-semibold */}
                <button onClick={() => setCategoriesExpanded(prev => !prev)} className={listItemButtonClass(false)}>
                    <span>📂</span>
                    <span className="flex-1">分类</span>
                    <svg className={`h-4 w-4 transition-transform ${categoriesExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {categoriesExpanded && (
                    <div className="mt-2 ml-4 pl-3 border-l border-gray-200 space-y-1">
                        {availableFilters.categories
                            .filter(category => category.label !== '未分类')
                            .map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveFilter({ type: 'category', value: category.id })}
                                    className={listItemButtonClass(isFilterActive('category', category.id))}
                                >
                                    <span className="flex-1 truncate">{category.label}</span>
                                    {category.count !== undefined && category.count > 0 && (
                                        // 1. 【修改】统一使用更柔和的指示器样式
                                        <span className="text-xs font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                                            {category.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                    </div>
                )}
            </nav>

            {/* 标签 */}
            <div className="flex flex-col">
                {/* 2. 【修改】移除 font-semibold */}
                <div className="w-full text-left px-3 py-2 flex items-center gap-3 text-gray-600">
                    <span>🏷️</span>
                    <span className="flex-1">标签</span>
                </div>
                <div className="grid grid-cols-1 gap-y-1 px-3 md:grid-cols-2 md:gap-x-2">
                    {availableFilters.tags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => setActiveFilter({ type: 'tag', value: tag.id })}
                            className={`w-full text-left px-2 py-1.5 rounded-md transition-colors duration-200 flex items-center justify-between text-sm ${isFilterActive('tag', tag.id)
                                ? 'bg-gray-800 text-white font-semibold'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className="truncate">#{tag.label}</span>
                            {tag.count !== undefined && tag.count > 0 && (
                                // 1. 【修改】统一使用更柔和的指示器样式
                                <span className={`text-xs font-medium rounded-full px-1.5 py-0.5 ${isFilterActive('tag', tag.id) ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {tag.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderCalendarTab = () => (
        <div className="flex flex-col h-full">
            {isInitialLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>)}</div>
            ) : (
                <nav className="flex flex-col gap-1.5 flex-grow">
                    {datesForMonth.map(date => {
                        const isActive = isFilterActive('date', date);
                        // 【增】获取当前日期的完成状态
                        const isCompleted = dailyStatuses[date] || false;
                        const dateObj = new Date(date + 'T00:00:00'); // 确保解析为本地时区
                        const displayDatePart = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
                        const displayDayOfWeekPart = dateObj.toLocaleDateString('zh-CN', { weekday: 'short' });
                        return (
                            <button
                                key={date}
                                onClick={() => setActiveFilter({ type: 'date', value: date })}
                                // 【改】应用新的样式
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex justify-between items-center group
                            ${isActive
                                        ? 'bg-gray-800 text-white font-semibold'
                                        : isCompleted
                                            ? 'bg-gray-50 text-gray-500 hover:bg-gray-100' // 【改】完成状态的样式
                                            : 'text-gray-700 hover:bg-gray-100' // 【改】默认状态的样式
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3">
                                    {/* 【增】渲染状态图标 */}
                                    <StatusIcon
                                        completed={isCompleted}
                                        onClick={() => onToggleDailyStatus(date, isCompleted)}
                                    />
                                    <span>{displayDatePart}</span>
                                </div>
                                <span className={`text-xs ${isCompleted && !isActive ? 'text-gray-400' : ''} ${isActive ? 'text-white' : 'group-hover:text-gray-600'}`}>
                                    {displayDayOfWeekPart}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            )}
            <div className="mt-auto pt-4">
                <div className="relative">
                    <select value={selectedMonth} onChange={e => onMonthChange(e.target.value)} className="w-full appearance-none bg-transparent border-none text-gray-800 py-2 pl-3 pr-8 rounded-md focus:outline-none cursor-pointer absolute inset-0 z-10 opacity-0">
                        {availableMonths.map(month => (<option key={month} value={month}>{formatMonthForDisplay(month)}</option>))}
                    </select>
                    <div className="w-full flex items-center justify-between bg-gray-100 border border-gray-300 text-gray-800 py-2 px-3 rounded-md pointer-events-none">
                        <span>{formatMonthForDisplay(selectedMonth)}</span>
                        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <aside className="flex flex-col flex-shrink-0 bg-gray-50 border-r border-gray-200 w-full h-full md:w-80 p-4 space-y-4 relative">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 pr-1">Briefing Hub</h1>
                <button onClick={handleRefreshClick} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-200 transition-colors disabled:cursor-wait">
                    <svg className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582A7.962 7.962 0 0112 4.062a8.002 8.002 0 018 8.002 8.002 8.002 0 01-8 8.002A7.962 7.962 0 014.582 15H4v5" />
                    </svg>
                </button>
            </div>

            {/* 3. 【增加】搜索表单 */}
            <form onSubmit={handleSearchSubmit} className="relative">
                <input
                    type="search"
                    placeholder="搜索简报关键词..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </form>


            <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
                <button className={`flex-1 ${tabButtonClass(activeTab === 'filters')}`} onClick={() => setActiveTab('filters')}>
                    <div className="flex justify-center items-center gap-2"><span>🏷️</span><span>分类</span></div>
                </button>
                <button className={`flex-1 ${tabButtonClass(activeTab === 'calendar')}`} onClick={() => setActiveTab('calendar')}>
                    <div className="flex justify-center items-center gap-2"><span>📅</span><span>日历</span></div>
                </button>
            </div>

            <div className="flex-grow overflow-y-scroll">
                {/* 
                   【优化】使用 CSS 显隐替代条件渲染 
                   两个 Tab 的内容都会被渲染，但只有激活的那个是可见的。
                   这样滚动位置和展开状态就不会丢失了。
                */}
                <div className={activeTab === 'filters' ? 'block h-full' : 'hidden'}>
                    {renderFiltersTab()}
                </div>
                <div className={activeTab === 'calendar' ? 'block h-full' : 'hidden'}>
                    {renderCalendarTab()}
                </div>
            </div>
            <div className="mt-4 mb-2">
                <ExternalLinks />
            </div>
        </aside>
    );
});

export default memo(Sidebar);