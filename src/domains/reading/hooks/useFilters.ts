import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Filter, AvailableFilters } from '@/shared/types';
import { getAvailableDates, getAvailableFilters } from '@/domains/reading/services/readingClient';
import { getTodayInShanghai } from '@/domains/reading/utils/date';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useUIStore } from '@/shared/store/uiStore';
import {
  useDailyStatusesForMonth,
  useUpdateDailyStatus,
} from '@/domains/reading/hooks/useDailyStatus';

const CACHE_KEY_ACTIVE_FILTER = 'cachedActiveFilter';
const CACHE_KEY_SELECTED_MONTH = 'cachedSelectedMonth';

interface UseFiltersProps {
  initialDates?: string[];
  initialAvailableFilters?: AvailableFilters;
}

export const useFilters = ({ initialDates, initialAvailableFilters }: UseFiltersProps = {}) => {
  const [dates, setDates] = useState<string[]>(initialDates || []);
  // Initializing selectedMonth with initialDates if available
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(CACHE_KEY_SELECTED_MONTH);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached selected month', e);
        }
      }
    }
    // Improve default month logic: if initialDates has data, use the latest month from there
    if (initialDates && initialDates.length > 0) {
      return initialDates[0].substring(0, 7);
    }
    return getTodayInShanghai().substring(0, 7);
  });
  // If we have initial data, we are not loading initially.
  const [isInitialLoad, setIsInitialLoad] = useState(!initialDates || initialDates.length === 0);

  const setActiveFilter = useUIStore((state) => state.setActiveFilter);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const storeAvailableFilters = useArticleStore((state) => state.availableFilters);
  // Use initial data if store is empty (SSR/Hydration)
  // Hydrate available filters: favor initialAvailableFilters (fresh SSR data) over potentially stale store data
  const availableFilters = useMemo(() => {
    if (
      initialAvailableFilters &&
      (initialAvailableFilters.tags.length > 0 || initialAvailableFilters.categories.length > 0)
    ) {
      return initialAvailableFilters;
    }
    return storeAvailableFilters;
  }, [initialAvailableFilters, storeAvailableFilters]);
  // const setAvailableFilters = useArticleStore(state => state.setAvailableFilters); // Keep this but remove the 'availableFilters' const definition line 43
  const setAvailableFilters = useArticleStore((state) => state.setAvailableFilters);

  // Initialize store with initial filters if provided and store is empty
  // [REFACTOR] Now handled synchronously in MainLayoutClient to prevent FOUC / Layout Shift
  // useEffect(() => {
  //   if (initialAvailableFilters && availableFilters.tags.length === 0) {
  //     setAvailableFilters(initialAvailableFilters);
  //   }
  // }, [initialAvailableFilters, setAvailableFilters, availableFilters.tags.length]);

  // --- 【核心集成】 ---
  // 1. 【增】使用 useDailyStatusesForMonth Hook 获取状态数据
  const { data: dailyStatuses } = useDailyStatusesForMonth(selectedMonth);

  // 2. 【增】使用 useUpdateDailyStatus Hook 获取更新函数
  const { mutate: updateStatus } = useUpdateDailyStatus();

  const handleToggleDailyStatus = useCallback(
    (date: string, currentStatus: boolean) => {
      // 封装一下，方便 UI 调用
      updateStatus({ date, isCompleted: !currentStatus });
    },
    [updateStatus],
  );
  // --- 结束集成 ---

  // 在 useEffect 中，我们只负责设置 filter，不再需要自己计算 timeSlot
  useEffect(() => {
    // If we have initial data (both dates and tags), we skip the initial fetch.
    // If only dates are present but tags are missing (e.g. SSR error), we should proceed to fetch to self-heal.
    const hasDates = initialDates && initialDates.length > 0;
    const hasTags = initialAvailableFilters && initialAvailableFilters.tags.length > 0;

    if (hasDates && hasTags) return;

    const fetchInitialFilterData = async () => {
      const today = getTodayInShanghai();

      // Check if URL has a date
      const dateMatch = window.location.pathname.match(/^\/date\/(\d{4}-\d{2}-\d{2})\/?$/);

      if (dateMatch) {
        const urlDate = dateMatch[1];
        const dateFilter = { type: 'date' as const, value: urlDate };
        setActiveFilter(dateFilter);
        setSelectedMonth(urlDate.substring(0, 7));
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(dateFilter));
        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(urlDate.substring(0, 7)));
      } else if (today) {
        const initialFilter = { type: 'date' as const, value: today };

        // Only set default filter if we are at root (homepage)
        if (window.location.pathname === '/') {
          setActiveFilter(initialFilter);
          sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(initialFilter));
          // selectedMonth is already initialized correctly via useState lazy init
        }
      }

      try {
        const [availableDates, filters] = await Promise.all([
          getAvailableDates(),
          getAvailableFilters(),
        ]);
        setDates(availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
        setAvailableFilters(filters);
      } catch (error) {
        console.error('Failed to fetch initial filter data', error);
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchInitialFilterData();
  }, [setAvailableFilters, setActiveFilter, initialDates, initialAvailableFilters]);

  const refreshFilters = useCallback(async () => {
    setIsRefreshing(true); // 开始刷新
    sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
    sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['availableDates'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyStatuses'] }),
      ]);
      // Force refetch
      // The actual data fetching and state updates (setDates, setAvailableFilters)
      // will now be handled by the react-query hooks that consume these invalidated queries.
      // We might still want to reset the active filter to today's date after a refresh.
      const today = getTodayInShanghai();
      if (today) {
        const resetFilter = { type: 'date' as const, value: today };
        setActiveFilter(resetFilter);
        setSelectedMonth(today.substring(0, 7));
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(resetFilter));
        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
      }
    } catch (error) {
      console.error('Failed to refresh sidebar data', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [setActiveFilter, queryClient]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    dates.forEach((date) => monthSet.add(date.substring(0, 7)));
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [dates]);

  const datesForMonth = useMemo(() => {
    return dates.filter((date) => date.startsWith(selectedMonth));
  }, [dates, selectedMonth]);

  const handleFilterChange = (filter: Filter | null) => {
    setActiveFilter(filter);
    if (filter) {
      sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(filter));
      if (filter.type === 'date') {
        const newMonth = filter.value.substring(0, 7);
        setSelectedMonth(newMonth);
        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(newMonth));
      }
    } else {
      sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
    }
  };

  const handleResetFilter = () => {
    const today = getTodayInShanghai();
    if (!today) return;
    const resetFilter = { type: 'date' as const, value: today };
    setActiveFilter(resetFilter);
    setSelectedMonth(today.substring(0, 7));
    sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(resetFilter));
    sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
  };

  return {
    isInitialLoad: isInitialLoad,
    isRefreshing,
    datesForMonth,
    availableFilters,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    handleFilterChange,
    handleResetFilter,
    refreshFilters,
    dailyStatuses: dailyStatuses || {}, // 确保始终返回一个对象
    handleToggleDailyStatus,
  };
};
