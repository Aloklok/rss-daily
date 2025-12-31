import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { page } from '@vitest/browser/context'; // Keeping this for now as the deprecation is just a warning, or I can try 'vitest/browser' if I am sure. Let's stick to fixing path first to be safe, or just ignore the warning which is non-fatal. Actually the error was import resolution.
import SidebarView from '../SidebarView';
import { useUIStore } from '../../../../store/uiStore';

// Mock dependencies
import { vi } from 'vitest';

vi.mock('../../../../store/uiStore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useUIStore: vi.fn(),
  };
});

// Mock hooks to avoid errors
vi.mock('../../../../hooks/useArticles', () => ({
  useBriefingArticles: () => ({ data: [], isFetching: false }),
  useFilteredArticles: () => ({ data: null }),
  useSearchResults: () => ({ data: null }),
  useStarredArticles: () => ({ data: [] }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('侧边栏可见性 (Sidebar Visibility)', () => {
  const defaultProps = {
    isInitialLoading: false,
    isRefreshingFilters: false,
    availableMonths: ['2023-01'],
    selectedMonth: '2023-01',
    onMonthChange: vi.fn(),
    datesForMonth: [],
    dailyStatuses: {},
    onToggleDailyStatus: vi.fn(),
    availableFilters: { categories: [], tags: [] },
    initialStarredHeaders: [],
  };

  it('在桌面端应正常显示 (Desktop Render)', async () => {
    // Set viewport to desktop
    await page.viewport(1280, 720);

    // Mock store state
    (useUIStore as any).mockImplementation((selector) => {
      const state = {
        activeFilter: null,
        timeSlot: 'morning',
        sidebarOpen: true, // Assuming default desktop is open or controlled by CSS
        setSidebarOpen: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
    (useUIStore as any).setState = vi.fn();

    render(<SidebarView {...defaultProps} />);

    // Verify sidebar is visible
    // We look for the <aside> or a container with specific class
    // SidebarView typically renders a <div className="..."> or <aside>
    // Let's verify by text content or role if possible.
    // Sidebar usually contains navigation items like "Briefing", "Sources"

    // Try to find by role 'complementary' or 'navigation' if semantic HTML is used
    // Or generic visibility of a known element
    const sidebar = screen.getByText(/Briefing|Sources/i);
    // Note: SidebarView might only render the *content* depending on how it's structured.
    // But the test asked for "Sidebar in Desktop should be visible".

    await expect.element(sidebar).toBeVisible();
  });
});
