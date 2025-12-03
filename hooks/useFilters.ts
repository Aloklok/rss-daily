// hooks/useFilters.ts

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, AvailableFilters } from '../types';
import { getAvailableDates, getAvailableFilters, getTodayInShanghai } from '../services/api';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import { useDailyStatusesForMonth, useUpdateDailyStatus } from './useDailyStatus';

const CACHE_KEY_ACTIVE_FILTER = 'cachedActiveFilter';
const CACHE_KEY_SELECTED_MONTH = 'cachedSelectedMonth';

export const useFilters = () => {
    const [dates, setDates] = useState<string[]>([]);
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
        return getTodayInShanghai().substring(0, 7);
    });
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const activeFilter = useUIStore(state => state.activeFilter);
    const setActiveFilter = useUIStore(state => state.setActiveFilter);
    const availableFilters = useArticleStore(state => state.availableFilters);
    const setAvailableFilters = useArticleStore(state => state.setAvailableFilters);
    const [isRefreshing, setIsRefreshing] = useState(false);



    // --- 【核心集成】 ---
    // 1. 【增】使用 useDailyStatusesForMonth Hook 获取状态数据
    const { data: dailyStatuses, isLoading: isLoadingStatuses } = useDailyStatusesForMonth(selectedMonth);

    // 2. 【增】使用 useUpdateDailyStatus Hook 获取更新函数
    const { mutate: updateStatus } = useUpdateDailyStatus();

    const handleToggleDailyStatus = useCallback((date: string, currentStatus: boolean) => {
        // 封装一下，方便 UI 调用
        updateStatus({ date, isCompleted: !currentStatus });
    }, [updateStatus]);
    // --- 结束集成 ---



    // 在 useEffect 中，我们只负责设置 filter，不再需要自己计算 timeSlot
    useEffect(() => {
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
                    getAvailableFilters()
                ]);
                setDates(availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
                setAvailableFilters(filters);
            } catch (error) {
                console.error("Failed to fetch initial filter data", error);
            } finally {
                setIsInitialLoad(false);
            }
        };
        fetchInitialFilterData();
    }, [setAvailableFilters, setActiveFilter]);

    const refreshFilters = useCallback(async () => {
        setIsRefreshing(true); // 开始刷新
        sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
        sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
        try {
            const [availableDatesNew, filtersNew] = await Promise.all([
                getAvailableDates(),
                getAvailableFilters()
            ]);
            setDates(availableDatesNew.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
            setAvailableFilters(filtersNew);
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
            setIsRefreshing(false); // 结束刷新
        }
    }, [setActiveFilter, setAvailableFilters]);

    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        dates.forEach(date => monthSet.add(date.substring(0, 7)));
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [dates]);

    const datesForMonth = useMemo(() => {
        return dates.filter(date => date.startsWith(selectedMonth));
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
        isInitialLoad: isInitialLoad || isLoadingStatuses,
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
        handleToggleDailyStatus
    };
};