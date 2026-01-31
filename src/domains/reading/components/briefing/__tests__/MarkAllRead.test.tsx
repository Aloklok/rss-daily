import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FloatingActionButtons from '@/domains/interaction/components/FloatingActionButtons';
import { useUIStore } from '@/shared/store/uiStore';
import { useArticleStore } from '@/domains/article/store/articleStore';
import { READ_TAG } from '@/domains/article/constants';

// Mock Hooks
// 1. useArticleActions
const mockHandleMarkAllClick = vi.fn();
vi.mock('@/domains/interaction/hooks/useArticleActions', () => ({
  useArticleActions: () => ({
    handleArticleStateChange: vi.fn(),
    handleMarkAllClick: mockHandleMarkAllClick,
    isUpdatingArticle: false,
    isMarkingAsRead: false,
  }),
}));

// 2. useArticles (Mocking useBriefingArticles to control available IDs)
const mockUseBriefingArticles = vi.fn();
const mockUseFilteredArticles = vi.fn();

vi.mock('@/domains/reading/hooks/useArticles', () => ({
  useBriefingArticles: (...args: any[]) => mockUseBriefingArticles(...args),
  useFilteredArticles: (...args: any[]) => mockUseFilteredArticles(...args),
  useSearchResults: () => ({ data: null }),
}));

// 3. Mock other hooks used in component
vi.mock('@/domains/reading/hooks/useArticleMetadata', () => ({
  useArticleMetadata: () => ({ isStarred: false, isRead: false, userTagLabels: [] }),
  // ...
}));
vi.mock('@/domains/reading/hooks/useFilters', () => ({
  useFilters: () => ({ handleResetFilter: vi.fn() }),
}));
vi.mock('@/domains/reading/services/readingClient', () => ({
  getCurrentTimeSlotInShanghai: () => 'morning',
}));

// Mock useQueryClient
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  __esModule: true,
}));

describe('全部已读按钮 (Mark All Read)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default Mock Returns
    mockUseBriefingArticles.mockReturnValue({ data: ['test-id-1'], isFetching: false });
    mockUseFilteredArticles.mockReturnValue({ data: null });

    useUIStore.setState({
      isAdmin: true,
      activeFilter: { type: 'date', value: '2023-01-01' },
      selectedArticleId: null,
      verdictFilter: null, // Reset verdict filter
    });
    // Reset Article Store
    useArticleStore.setState({ articlesById: {} });
  });

  it('当列表中没有未读文章时应禁用按钮', () => {
    useArticleStore.setState({
      articlesById: {
        'test-id-1': { id: 'test-id-1', tags: [READ_TAG] } as any,
      },
    });

    render(<FloatingActionButtons isAdmin={true} />);
    const btn = screen.getByLabelText('Mark all as read');
    expect(btn).toBeDisabled();
  });

  it('当列表中存在未读文章时应激活按钮', () => {
    useArticleStore.setState({
      articlesById: {
        'test-id-1': { id: 'test-id-1', tags: [] } as any,
      },
    });

    render(<FloatingActionButtons isAdmin={true} />);
    const btn = screen.getByLabelText('Mark all as read');
    expect(btn).toBeEnabled();
  });

  it('点击时应触发 handleMarkAllClick 并传递正确的文章 ID', async () => {
    const user = userEvent.setup();
    useArticleStore.setState({
      articlesById: {
        'test-id-1': { id: 'test-id-1', tags: [] } as any,
      },
    });

    render(<FloatingActionButtons isAdmin={true} />);
    const btn = screen.getByLabelText('Mark all as read');
    await user.click(btn);

    expect(mockHandleMarkAllClick).toHaveBeenCalledTimes(1);
    expect(mockHandleMarkAllClick).toHaveBeenCalledWith(['test-id-1']);
  });

  it('在分类筛选 (Category Filter) 下应只标记该分类的文章', async () => {
    const user = userEvent.setup();

    // 1. 设置分类筛选模式
    useUIStore.setState({
      activeFilter: { type: 'category', value: 'AI' },
    });

    // 2. Mock useFilteredArticles 返回特定分类的文章
    mockUseFilteredArticles.mockReturnValue({
      data: {
        pages: [{ articles: ['cat-id-1', 'cat-id-2'] }],
      },
    });
    // 确保 Briefing 接口不干扰 (虽然 activeFilter=category 时组件不应读取它)
    mockUseBriefingArticles.mockReturnValue({ data: [], isFetching: false });

    // 3. 设置文章状态 (都是未读)
    useArticleStore.setState({
      articlesById: {
        'cat-id-1': { id: 'cat-id-1', tags: [] } as any,
        'cat-id-2': { id: 'cat-id-2', tags: [] } as any,
      },
    });

    render(<FloatingActionButtons isAdmin={true} />);
    const btn = screen.getByLabelText('Mark all as read');
    await user.click(btn);

    expect(mockHandleMarkAllClick).toHaveBeenCalledWith(['cat-id-1', 'cat-id-2']);
  });

  it('在同时具有时段和 Verdict 筛选 (Cross-Filtering) 时应只标记符合条件的文章', async () => {
    const user = userEvent.setup();

    // 1. 设置日期 + Verdict 筛选模式 (例如：只看 "Market Take")
    useUIStore.setState({
      activeFilter: { type: 'date', value: '2023-01-01' },
      verdictFilter: 'market_take',
    });

    // 2. Mock Briefing 文章列表 (包含混合类型的文章)
    mockUseBriefingArticles.mockReturnValue({
      data: ['id-market', 'id-briefing'],
      isFetching: false,
    });

    // 3. 设置 store 中的文章详情 (包含 verdict 类型)
    useArticleStore.setState({
      articlesById: {
        'id-market': { id: 'id-market', tags: [], verdict: { type: 'market_take' } } as any,
        'id-briefing': { id: 'id-briefing', tags: [], verdict: { type: 'briefing' } } as any,
      },
    });

    render(<FloatingActionButtons isAdmin={true} />);
    const btn = screen.getByLabelText('Mark all as read');
    await user.click(btn);

    // 期望：只标记 verdict.type === 'market_take' 的文章
    expect(mockHandleMarkAllClick).toHaveBeenCalledWith(['id-market']);
  });

  it('双重筛选验证：同时应用 TimeSlot (API端) 和 Verdict (客户端) 筛选', async () => {
    const user = userEvent.setup();

    // 1. 设置双重筛选条件
    // TimeSlot: 'evening' (影响 API 请求参数)
    // Verdict: 'market_take' (影响客户端后续过滤)
    useUIStore.setState({
      activeFilter: { type: 'date', value: '2023-01-01' },
      timeSlot: 'evening',
      verdictFilter: 'market_take',
    });

    // 2. Mock API 返回对应 TimeSlot 的文章
    // 这里我们模拟 API 已经返回了 "晚间" 的文章列表
    mockUseBriefingArticles.mockReturnValue({
      data: ['id-evening-market', 'id-evening-briefing'],
      isFetching: false,
    });

    // 3. 设置文章详情 (用于客户端 Verdict 过滤)
    useArticleStore.setState({
      articlesById: {
        'id-evening-market': {
          id: 'id-evening-market',
          tags: [],
          verdict: { type: 'market_take' },
        } as any,
        'id-evening-briefing': {
          id: 'id-evening-briefing',
          tags: [],
          verdict: { type: 'briefing' }, // 不符合 verdictFilter
        } as any,
      },
    });

    render(<FloatingActionButtons isAdmin={true} />);

    // 验证 1: 确保 API Hook 是带着正确的 TimeSlot 调用的
    // 参数签名已更新为: (date, slot, initialData?, tableName?)
    expect(mockUseBriefingArticles).toHaveBeenCalledWith(
      '2023-01-01',
      'evening',
      undefined,
      'articles_view',
    );

    // 触发 "全部已读"
    const btn = screen.getByLabelText('Mark all as read');
    await user.click(btn);

    // 验证 2: 确保最终传给 handleMarkAllClick 的 ID
    // 既经过了 API (TimeSlot) 筛选 (在 Mock data 中体现)
    // 又经过了客户端 (Verdict) 筛选
    expect(mockHandleMarkAllClick).toHaveBeenCalledWith(['id-evening-market']);
  });
});
