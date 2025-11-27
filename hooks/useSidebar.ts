// hooks/useSidebar.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Article } from '../types';
import { getArticlesDetails, getStarredArticles } from '../services/api'; // getStarredArticles might be needed if you keep the old structure.
import { useStarredArticles } from './useArticles'; // 导入新的 Hook

export type ActiveTab = 'filters' | 'calendar';

export const useSidebar = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
    const [starredExpanded, setStarredExpanded] = useState<boolean>(false);

    // 1. 【核心修改】从 useStarredArticles 中解构 isFetching
    const { data: starredArticlesData, isLoading, isFetching, refetch: refreshStarred } = useStarredArticles();

    // 2. 【核心修改】isLoadingStarred 现在应该同时考虑 isLoading 和 isFetching
    // isLoading 用于初始加载的骨架屏，isFetching 用于刷新按钮的旋转动画
    const isLoadingStarred = isLoading || isFetching;


    const toggleStarred = useCallback(() => {
        setStarredExpanded(prev => !prev);
    }, []);

    // 【改】starredArticles 现在直接使用 useStarredArticles 返回的数据
    const starredArticles = useMemo(() => {
        return starredArticlesData || [];
    }, [starredArticlesData]);


    // 【核心修改】在这里新增一行
    const starredCount = starredArticles.length || 0;


    return {
        activeTab,
        setActiveTab,
        starredExpanded,
        toggleStarred,
        starredArticles,
        isLoadingStarred, // 这个状态现在能正确反映刷新动作了
        refreshStarred,
        starredCount, // 返回收藏文章数量
    };
};