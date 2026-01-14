import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../SidebarView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/',
  __esModule: true,
}));

// Mock useSidebar to avoid React Query dependency
vi.mock('@/hooks/useSidebar', () => ({
  useSidebar: () => ({
    activeTab: 'calendar',
    setActiveTab: vi.fn(),
    starredExpanded: false,
    toggleStarred: vi.fn(),
    starredArticles: [],
    isLoadingStarred: false,
    refreshStarred: vi.fn(),
    starredCount: 0,
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe('归档入口验证 (Archive Link Verification)', () => {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('侧边栏应包含指向 /archive 的归档链接图标', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Sidebar {...defaultProps} />
      </QueryClientProvider>,
    );

    // 查找带有特定 title 或 aria-label 的图标链接
    const archiveLink = screen.getByRole('link', { name: /查看历史归档/i });

    // 验证链接存在
    expect(archiveLink).toBeInTheDocument();

    // 验证 href 是否正确 (这是爬虫抓取的关键)
    expect(archiveLink).toHaveAttribute('href', '/archive');

    // 验证图标内部是否包含 SVG (确保不仅是空链接)
    const svg = archiveLink.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
