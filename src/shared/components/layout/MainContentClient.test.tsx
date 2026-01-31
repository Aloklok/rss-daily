import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainContentClient from './MainContentClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from '@/shared/store/uiStore';

import { useArticleStore } from '@/domains/article/store/articleStore';
import { zh } from '@/app/i18n/dictionaries';

// Mock Child Components to isolate MainContentClient logic
vi.mock('@/domains/reading/components/article/ArticleDetailClient', () => ({
  default: () => <div data-testid="mock-article-detail">Article Detail</div>,
}));
vi.mock('@/domains/reading/components/briefing/BriefingView', () => ({
  default: vi.fn(({ isLoading }: any) => (
    <div data-testid="mock-briefing">{isLoading ? 'Loading...' : 'Briefing View'}</div>
  )),
}));
vi.mock('@/domains/reading/components/search/SearchList', () => ({
  default: () => <div data-testid="mock-search-list">Search List</div>,
}));
vi.mock('@/domains/reading/components/stream/StreamView', () => ({
  default: () => <div data-testid="mock-stream-list">Stream List</div>,
}));
vi.mock('@/domains/reading/components/trends/TrendsPage', () => ({
  default: () => <div data-testid="mock-trends-page">Trends Page</div>,
}));
vi.mock('@/shared/ui/Spinner', () => ({
  default: () => <div data-testid="mock-spinner">Loading Spinner</div>,
}));

// Mock Hooks that trigger network requests
// We don't want real network requests in this test, but we DO want the effect logic to run.
// The effect logic uses queryClient.setQueryData directly, so we need a real QueryClient.
// However, 'useBriefingArticles' hook will also try to fetch. Let's mock it to return stale/empty data.
vi.mock('@/hooks/useArticles', () => ({
  useBriefingArticles: vi.fn(() => ({
    data: [], // Return empty to simulate "no data yet" from network
    isLoading: true,
  })),
  useFilteredArticles: vi.fn(() => ({
    data: { pages: [] },
    isLoading: false,
  })),
  useSearchResults: vi.fn(() => ({
    data: { pages: [] },
    isLoading: false,
  })),
  useUpdateArticleState: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

// Mock Hydration Hook to avoid side effects
vi.mock('@/hooks/useArticleStateHydration', () => ({
  useArticleStateHydration: vi.fn(),
}));

describe('MainContentClient 集成测试 (跨天水合)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // 为每个测试重置 QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // 重置 Store
    useUIStore.setState({ activeFilter: null, timeSlot: null, selectedArticleId: null });
    useArticleStore.setState({ articlesById: {} });

    // Mock 当前日期为 "今天" (2026-01-03)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-03T10:00:00+08:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('如果 [客户端日期(今天)] 与 [服务端日期(昨天)] 不符，则不应将 initialArticles 水合进缓存', async () => {
    // 场景：
    // 客户端时间：2026-01-03 ("今天")
    // SSR 属性：initialDate="2026-01-02" ("昨天")，并携带了一些文章
    // 预期：组件计算出的 dateToUse 为 "2026-01-03"，这与 initialDate 不符。
    //      因此，它绝不能将 01-02 的文章注入到 'briefing', '2026-01-03' 的缓存键中。

    const yesterday = '2026-01-02';
    const today = '2026-01-03';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockInitialArticles: any[] = [
      { id: '1', title: 'Yesterday News', n8n_processing_date: `${yesterday}T12:00:00Z` },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <MainContentClient
          initialDate={yesterday}
          initialArticles={mockInitialArticles} // 这些属于昨天！
          // 强制客户端认为正在查看 "今天" (01-03)，即使 SSR 给了 "昨天" (01-02)
          initialActiveFilter={{ type: 'date', value: today }}
          isHomepage={true}
          today={today}
          dict={zh}
        />
      </QueryClientProvider>,
    );

    // 断言：检查“今天”的查询缓存
    expect(screen.getByTestId('mock-briefing')).toBeInTheDocument();

    // 关键检查：今天的缓存必须是空的（undefined），因为我们阻止了污染。
    const todayCache = queryClient.getQueryData(['briefing', today, 'all', 'articles_view']);
    expect(todayCache).toBeUndefined();
  });

  it('如果 [客户端日期] 与 [服务端日期] 匹配，则应正常进行 initialArticles 水合（正常情况）', async () => {
    // 场景：正常水合（SSR 与客户端匹配）
    const today = '2026-01-03';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockInitialArticles: any[] = [
      { id: '2', title: 'Today News', n8n_processing_date: `${today}T12:00:00Z` },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <MainContentClient
          initialDate={today}
          initialArticles={mockInitialArticles}
          initialActiveFilter={{ type: 'date', value: today }}
          isHomepage={true}
          today={today}
          dict={zh}
        />
      </QueryClientProvider>,
    );

    // 断言：检查“今天”的查询缓存
    const todayCache = queryClient.getQueryData(['briefing', today, 'all', 'articles_view']);
    expect(todayCache).toEqual(['2']); // 应该包含 ID
  });

  it('如果 [当前过滤器] 覆盖了日期（例如搜索模式），则不应进行水合', async () => {
    // 场景：用户直接访问搜索 URL
    // SSR 可能会返回一些 initialDate/articles，但此时 activeFilter 是 'search'
    const today = '2026-01-03';

    // 设置 Store 状态以模拟搜索模式激活
    useUIStore.setState({ activeFilter: { type: 'search', value: 'AI' } });

    render(
      <QueryClientProvider client={queryClient}>
        <MainContentClient
          initialDate={today}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialArticles={[{ id: '3', title: 'Unused' } as any]}
          initialActiveFilter={{ type: 'search', value: 'AI' }}
          isHomepage={false}
          today={today}
          dict={zh}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('mock-search-list')).toBeInTheDocument();

    // 断言：简报缓存不应被修改
    const briefingCache = queryClient.getQueryData(['briefing', today, 'all', 'articles_view']);
    expect(briefingCache).toBeUndefined();
  });

  it('Bug 复现：点击类型过滤器时，应同步更新 Global UIStore 的 verdictFilter 状态', async () => {
    // 场景：在首页点击 "新闻" 过滤器
    // 预期：MainContentClient 应该调用 uiStore.setVerdictFilter，以便 FloatingActionButtons 能够感知。
    const today = '2026-01-03';

    // 1. 获取 Briefing 组件的 Mock
    const BriefingMock = (await import('@/domains/reading/components/briefing/BriefingView'))
      .default as any;

    render(
      <QueryClientProvider client={queryClient}>
        <MainContentClient
          initialDate={today}
          initialArticles={[]}
          today={today}
          isHomepage={true}
          dict={zh}
        />
      </QueryClientProvider>,
    );

    // 2. 模拟点击 “新闻” (id: '新闻事件型')
    // 我们在 Mock 中可以直接调用 prop
    const briefingProps = BriefingMock.mock.calls[0][0];
    expect(briefingProps.onVerdictFilterChange).toBeDefined();

    // 执行点击动作（触发回调）
    briefingProps.onVerdictFilterChange('新闻事件型');

    // 3. 断言：Global UIStore 应该被更新了
    // 注意：目前的实现只更新了 MainContentClient 的本地 useState，所以这里预期会失败！
    expect(useUIStore.getState().verdictFilter).toBe('新闻事件型');
  });
});
