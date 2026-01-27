import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import Sidebar from '../SidebarView';
import { useUIStore } from '@/shared/store/uiStore';
import { zh } from '@/app/i18n/dictionaries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  __esModule: true,
}));

// Mock useSidebar
vi.mock('@/hooks/useSidebar', () => ({
  useSidebar: () => ({
    activeTab: 'calendar',
    starredArticles: [],
  }),
}));

describe('SSR 兼容性验证 (No-JS Crawlability)', () => {
  const defaultProps = {
    isInitialLoading: false,
    isRefreshingFilters: false,
    availableMonths: ['2026-01'],
    selectedMonth: '2026-01',
    onMonthChange: vi.fn(),
    datesForMonth: [],
    dailyStatuses: {},
    onToggleDailyStatus: vi.fn(),
    availableFilters: { categories: [], tags: [] },
    initialStarredHeaders: [],
    dict: zh,
  };

  it('在服务端渲染阶段应包含归档链接', () => {
    // 模拟管理员状态
    useUIStore.setState({ isAdmin: true });

    const queryClient = new QueryClient();
    // 使用 renderToString 模拟纯服务端输出 HTML (完全没有 JS 执行)
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <Sidebar {...defaultProps} />
      </QueryClientProvider>,
    );

    // 验证 HTML 字符串中是否包含关键的 a 标签和 href
    expect(html).toContain('href="/archive"');
    expect(html).toContain(`aria-label="${zh.archive.title}"`);
  });
});
