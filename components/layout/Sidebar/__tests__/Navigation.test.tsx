import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../SidebarView';
import { useUIStore } from '../../../../store/uiStore';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
}));

// Mock useSidebar to avoid React Query dependency
vi.mock('../../../../hooks/useSidebar', () => ({
  useSidebar: () => ({
    activeTab: 'filters',
    setActiveTab: vi.fn(),
    starredExpanded: false,
    toggleStarred: vi.fn(),
    starredArticles: [],
    isLoadingStarred: false,
    refreshStarred: vi.fn(),
    starredCount: 0,
  }),
}));

// Mock dynamic components to avoid loading complexity/suspense in unit tests if needed.
// However, since we want to test Search which is dynamic, we should let it load or mock it simply if we just want to test parent logic.
// But here we want integration test of Search triggering navigation.
// Let's rely on real loading or wait for it.
// SidebarSearch is lazy loaded.

describe('侧边栏导航 (Sidebar Navigation)', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    useUIStore.setState({
      isAdmin: true, // Search requires admin
      activeFilter: null,
      selectedArticleId: null,
    });
  });

  it('管理员应能看到搜索框', async () => {
    render(<Sidebar {...defaultProps} />);
    // SidebarSearch is dynamic, so await it
    const input = await screen.findByPlaceholderText(/搜索简报关键词/i);
    expect(input).toBeInTheDocument();
  });

  it('非管理员不应看到搜索框', () => {
    useUIStore.setState({ isAdmin: false });
    render(<Sidebar {...defaultProps} />);
    const input = screen.queryByPlaceholderText(/搜索简报关键词/i);
    expect(input).not.toBeInTheDocument();
  });

  it('提交搜索时应跳转到正确 URL', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);

    const input = await screen.findByPlaceholderText(/搜索简报关键词/i);

    // Type and Enter
    await user.type(input, 'Vitest Speed{enter}');

    // Expect router push to be called with correct URL parameters
    expect(mockPush).toHaveBeenCalledWith('/?filter=search&value=Vitest%20Speed');

    // Also verify store state update if applicable (though router.push is the main side effect here)
    // The component sets activeFilter before pushing
    const activeFilter = useUIStore.getState().activeFilter;
    expect(activeFilter).toEqual({ type: 'search', value: 'Vitest Speed' });
  });

  it('点击"按订阅源浏览"应跳转到 /sources', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);

    const button = screen.getByRole('button', { name: /按订阅源浏览/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith('/sources');
  });
});
