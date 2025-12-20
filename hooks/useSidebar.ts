// hooks/useSidebar.ts

import { usePathname } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useStarredArticles } from './useArticles'; // 导入新的 Hook
import { useUIStore } from '../store/uiStore';

export type ActiveTab = 'filters' | 'calendar';

// Update useSidebar signature
interface UseSidebarProps {
  initialStarredHeaders?: { id: string | number; title: string; tags: string[] }[];
}

export const useSidebar = ({ initialStarredHeaders }: UseSidebarProps = {}) => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (
      pathname?.includes('/stream/') ||
      pathname?.includes('/search/') ||
      pathname?.includes('/sources') ||
      pathname === '/trends'
    ) {
      return 'filters';
    }
    return 'calendar';
  });
  const [starredExpanded, setStarredExpanded] = useState<boolean>(false);
  const activeFilter = useUIStore((state) => state.activeFilter);

  // Sync activeTab with activeFilter
  useEffect(() => {
    if (activeFilter?.type === 'date') {
      // eslint-disable-next-line
      setActiveTab((current) => (current === 'calendar' ? current : 'calendar'));
    } else if (activeFilter?.type === 'category' || activeFilter?.type === 'tag') {
      setActiveTab((current) => (current === 'filters' ? current : 'filters'));
    }
  }, [activeFilter]);

  // 1. 【核心修改】从 useStarredArticles 中解构 isFetching，传入 initialStarredHeaders
  const {
    data: starredArticlesData,
    isLoading,
    isFetching,
    refetch: refreshStarred,
  } = useStarredArticles(initialStarredHeaders);

  // 2. 【核心修改】isLoadingStarred 现在应该同时考虑 isLoading 和 isFetching
  // isLoading 用于初始加载的骨架屏，isFetching 用于刷新按钮的旋转动画
  const isLoadingStarred = isLoading || isFetching;

  const toggleStarred = useCallback(() => {
    setStarredExpanded((prev) => !prev);
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
