import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SidebarBriefing from '../SidebarBriefing';
import React from 'react';
import { zh } from '@/app/i18n/dictionaries';

// Mock Next.js navigation
const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  __esModule: true,
}));

// Mock getTodayInShanghai
vi.mock('@/domains/reading/utils/date', async () => {
  const actual = await vi.importActual('@/domains/reading/utils/date');
  return {
    ...actual,
    getTodayInShanghai: vi.fn(() => '2026-01-29'),
  };
});

// Mock SidebarBriefing dependencies if any (none crucial for logic test)
vi.mock('@/shared/store/uiStore', () => ({
  useUIStore: (fn: any) => fn({ isAdmin: false }),
}));

describe('SidebarBriefing 选中逻辑 (Selection Logic)', () => {
  const today = '2026-01-29';
  const defaultProps = {
    isInitialLoading: false,
    availableMonths: ['2026-01'],
    selectedMonth: '2026-01',
    onMonthChange: vi.fn(),
    datesForMonth: [today, '2026-01-28'],
    dailyStatuses: {},
    onToggleDailyStatus: vi.fn(),
    activeFilter: null,
    onDateSelect: vi.fn(),
    selectedArticleId: null,
    dict: zh,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('在日期页面时应正确高亮 (Should highlight on date page)', () => {
    mockPathname.mockReturnValue('/date/2026-01-29');
    render(<SidebarBriefing {...defaultProps} />);

    const highlightElement = screen.getByText('1月29日').closest('a');
    expect(highlightElement).toHaveClass('bg-indigo-600');
  });

  it('在首页且无过滤器时应高亮"今天" (Should highlight today on homepage without filter)', () => {
    mockPathname.mockReturnValue('/');
    render(<SidebarBriefing {...defaultProps} />);

    const highlightElement = screen.getByText('1月29日').closest('a');
    expect(highlightElement).toHaveClass('bg-indigo-600');

    const otherDateElement = screen.getByText('1月28日').closest('a');
    expect(otherDateElement).not.toHaveClass('bg-indigo-600');
  });

  it('在英文首页且无过滤器时应高亮"今天" (Should highlight today on en homepage without filter)', () => {
    mockPathname.mockReturnValue('/en');
    render(<SidebarBriefing {...defaultProps} />);

    const highlightElement = screen.getByText('1月29日').closest('a');
    expect(highlightElement).toHaveClass('bg-indigo-600');
  });

  it('在首页但有其他过滤器时不应高亮"今天" (Should not highlight today on homepage with other filter)', () => {
    mockPathname.mockReturnValue('/');
    render(<SidebarBriefing {...defaultProps} activeFilter={{ type: 'search', value: 'test' }} />);

    const highlightElement = screen.getByText('1月29日').closest('a');
    expect(highlightElement).not.toHaveClass('bg-indigo-600');
  });
});
