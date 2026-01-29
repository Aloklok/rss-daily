import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Filter } from '@/types';
import { useUIStore } from '@/shared/store/uiStore';
import { getTodayInShanghai } from '@/domains/reading/utils/date';
import { Dictionary } from '@/app/i18n/dictionaries';

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
  dict: Dictionary;
}

const StatusIcon: React.FC<{ completed: boolean; onClick: (e: React.MouseEvent) => void }> = ({
  completed,
  onClick,
}) => {
  const isAdmin = useUIStore((state) => state.isAdmin);

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
      <div onClick={handleClick} className={`relative ${isAdmin ? 'cursor-pointer' : ''}`}>
        <svg className={`${baseClasses} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`relative ${isAdmin ? 'cursor-pointer' : ''}`}>
      <svg
        className={`${baseClasses} text-gray-300 group-hover:text-gray-400`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    </div>
  );
};

const formatMonthForDisplay = (month: string, dict: Dictionary) => {
  if (!month) return '';
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  const locale = dict.lang === 'zh' ? 'zh-CN' : 'en-US';
  return date.toLocaleString(locale, { year: 'numeric', month: 'long' });
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
  selectedArticleId,
  dict,
}) => {
  const pathname = usePathname();
  const isAdmin = useUIStore((state) => state.isAdmin);
  const isFilterActive = (type: string, value: string) => {
    // Legacy support for non-date filters (if any) or strict filter mode
    if (type !== 'date') {
      return activeFilter?.type === type && activeFilter?.value === value && !selectedArticleId;
    }
    // Pathname based matching for Date
    // Current Format: /date/2025-01-26 or /en/date/2025-01-26
    if (pathname?.includes(`/date/${value}`)) {
      return true;
    }

    // 首页逻辑：如果在首页且没有其他激活的过滤器，则高亮“今天”
    const isHomepage = pathname === '/' || pathname === '/en' || pathname === '/en/';
    const today = getTodayInShanghai();
    return isHomepage && !activeFilter && value === today;
  };

  const currentMonth = getTodayInShanghai().substring(0, 7);
  const allDisplayMonths = Array.from(new Set([...availableMonths, selectedMonth, currentMonth]))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex h-full flex-col space-y-4">
      {isInitialLoading ? (
        <div className="grow space-y-3 px-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="dark:bg-midnight-card h-12 animate-pulse rounded-lg bg-gray-100"
            ></div>
          ))}
        </div>
      ) : datesForMonth.length === 0 ? (
        <div className="flex grow flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="dark:bg-midnight-card mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium">{dict.briefing.empty.dateEmpty}</span>
        </div>
      ) : (
        <nav className="flex grow flex-col gap-2 overflow-y-auto pr-1 pb-4">
          {datesForMonth.map((date) => {
            const isActive = isFilterActive('date', date);
            const isCompleted = dailyStatuses[date] || false;
            const dateObj = new Date(date + 'T00:00:00');
            const locale = dict.lang === 'zh' ? 'zh-CN' : 'en-US';
            const displayDatePart = dateObj.toLocaleDateString(locale, {
              month: 'long',
              day: 'numeric',
            });
            const displayDayOfWeekPart = dateObj.toLocaleDateString(locale, { weekday: 'short' });

            return (
              <Link
                prefetch={false}
                key={date}
                href={dict.lang === 'zh' ? `/date/${date}` : `/en/date/${date}`}
                onClick={() => onDateSelect(date)}
                className={`group flex w-full items-center justify-between rounded-lg border border-transparent px-4 py-2 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isCompleted && isAdmin
                      ? 'dark:hover:bg-midnight-card text-gray-400 hover:bg-gray-100 dark:text-gray-500'
                      : 'dark:hover:bg-midnight-card text-gray-700 hover:bg-gray-100 dark:text-gray-200'
                } cursor-pointer`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon
                    completed={isCompleted}
                    onClick={(e) => {
                      e.preventDefault(); // Prevent Link navigation when clicking checkbox
                      onToggleDailyStatus(date, isCompleted);
                    }}
                  />
                  <span className={`font-medium ${isActive ? 'text-white' : ''}`}>
                    {displayDatePart}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-black/20 dark:text-gray-500 dark:group-hover:bg-black/40'
                  }`}
                >
                  {displayDayOfWeekPart}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Month Selector - Moved to bottom */}
      <div className="mt-auto pt-2">
        <div className="group relative">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="absolute inset-0 z-10 w-full cursor-pointer appearance-none rounded-md border-none bg-transparent py-2 pr-8 pl-3 text-gray-800 opacity-0 focus:outline-hidden"
            aria-label="选择月份"
            title="选择月份"
          >
            {allDisplayMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthForDisplay(month, dict)}
              </option>
            ))}
          </select>
          <div className="dark:bg-midnight-card dark:border-midnight-border pointer-events-none flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-700 shadow-xs transition-all duration-200 group-hover:border-indigo-300 dark:text-gray-200 dark:group-hover:border-indigo-700">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">📅</span>
              <span className="text-sm font-semibold">
                {formatMonthForDisplay(selectedMonth, dict)}
              </span>
            </div>
            <svg
              className="h-4 w-4 text-gray-400 transition-colors group-hover:text-indigo-500 dark:text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarBriefing;
