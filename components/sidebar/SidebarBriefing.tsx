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
}

const StatusIcon: React.FC<{ completed: boolean; onClick: (e: React.MouseEvent) => void }> = ({ completed, onClick }) => {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(e);
    };

    const baseClasses = "h-5 w-5 cursor-pointer transition-all duration-200 ease-in-out transform group-hover:scale-110";

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
    onDateSelect
}) => {
    const isFilterActive = (type: string, value: string) => {
        return activeFilter?.type === type && activeFilter?.value === value;
    };

    return (
        <div className="flex flex-col h-full">
            {isInitialLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>)}</div>
            ) : (
                <nav className="flex flex-col gap-1.5 flex-grow">
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
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex justify-between items-center group
                            ${isActive
                                        ? 'bg-gray-800 text-white font-semibold'
                                        : isCompleted
                                            ? 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3">
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
};

export default SidebarBriefing;
