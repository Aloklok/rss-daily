import React from 'react';
import { Filter } from '../../types';

interface SidebarBriefingProps {
    isInitialLoading: boolean;
    availableMonths: string[];
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    datesForMonth: string[];
    dailyStatuses: Record<string, boolean>;
    onToggleDailyStatus: (date: string, currentStatus: boolean) => void;
    activeFilter: Filter | null;
    onDateSelect: (date: string) => void;
    selectedArticleId: string | number | null;
}

import { useUIStore } from '../../store/uiStore';
import { getTodayInShanghai } from '../../services/api';

const StatusIcon: React.FC<{ completed: boolean; onClick: (e: React.MouseEvent) => void }> = ({ completed, onClick }) => {
    const isAdmin = useUIStore(state => state.isAdmin);

    if (!isAdmin) return null;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isAdmin) {
            onClick(e);
        }
    };

    const baseClasses = `h-5 w-5 transition-all duration-200 ease-in-out transform ${isAdmin ? 'cursor-pointer group-hover:scale-110' : 'cursor-default opacity-50'}`;

    if (completed) {
        return (
            <div onClick={handleClick} className="relative">
                <svg className={`${baseClasses} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            </div>
        );
    }

    return (
        <div onClick={handleClick} className="relative">
            <svg className={`${baseClasses} text-gray-300 group-hover:text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
            </svg>
        </div>
    );
};

const formatMonthForDisplay = (month: string) => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
};

const SidebarBriefing: React.FC<SidebarBriefingProps> = ({
    isInitialLoading,
    availableMonths,
    selectedMonth,
    onMonthChange,
    datesForMonth,
    dailyStatuses,
    onToggleDailyStatus,
    activeFilter,
    onDateSelect,
    selectedArticleId
}) => {
    const isAdmin = useUIStore(state => state.isAdmin);
    const isFilterActive = (type: string, value: string) => {
        return activeFilter?.type === type && activeFilter?.value === value && !selectedArticleId;
    };

    const currentMonth = getTodayInShanghai().substring(0, 7);
    const allDisplayMonths = Array.from(new Set([...availableMonths, selectedMonth, currentMonth]))
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a));

    return (
        <div className="flex flex-col h-full space-y-4">
            {isInitialLoading ? (
                <div className="space-y-3 px-1 flex-grow">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-midnight-card rounded-lg animate-pulse"></div>)}</div>
            ) : datesForMonth.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-400 dark:text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-midnight-card rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium">本月暂无简报</span>
                </div>
            ) : (
                <nav className="flex flex-col gap-2 flex-grow overflow-y-auto pr-1 pb-4">
                    {datesForMonth.map(date => {
                        const isActive = isFilterActive('date', date);
                        const isCompleted = dailyStatuses[date] || false;
                        const dateObj = new Date(date + 'T00:00:00');
                        const displayDatePart = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
                        const displayDayOfWeekPart = dateObj.toLocaleDateString('zh-CN', { weekday: 'short' });

                        return (
                            <button
                                key={date}
                                onClick={() => onDateSelect(date)}
                                className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 flex justify-between items-center group border border-transparent
                            ${isActive
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : isCompleted && isAdmin
                                            ? 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-midnight-card'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-midnight-card'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3">
                                    <StatusIcon
                                        completed={isCompleted}
                                        onClick={() => onToggleDailyStatus(date, isCompleted)}
                                    />
                                    <span className={`font-medium ${isActive ? 'text-white' : ''}`}>{displayDatePart}</span>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-100 text-gray-500 dark:bg-black/20 dark:text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-black/40'
                                    }`}>
                                    {displayDayOfWeekPart}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            )}

            {/* Month Selector - Moved to bottom */}
            <div className="mt-auto pt-2">
                <div className="relative group">
                    <select
                        value={selectedMonth}
                        onChange={e => onMonthChange(e.target.value)}
                        className="w-full appearance-none bg-transparent border-none text-gray-800 py-2 pl-3 pr-8 rounded-md focus:outline-none cursor-pointer absolute inset-0 z-10 opacity-0"
                    >
                        {allDisplayMonths.map(month => (<option key={month} value={month}>{formatMonthForDisplay(month)}</option>))}
                    </select>
                    <div className="w-full flex items-center justify-between bg-white dark:bg-midnight-card border border-gray-200 dark:border-midnight-border shadow-sm group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition-all duration-200 text-gray-700 dark:text-gray-200 py-2.5 px-4 rounded-lg pointer-events-none">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-gray-500">📅</span>
                            <span className="text-sm font-semibold">{formatMonthForDisplay(selectedMonth)}</span>
                        </div>
                        <svg className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SidebarBriefing;
