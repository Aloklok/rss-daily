import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainContentClient from './MainContentClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from '../../store/uiStore';
import { useArticleStore } from '../../store/articleStore';

// Mock Child Components to isolate MainContentClient logic
vi.mock('../features/article/ArticleDetailClient', () => ({
  default: () => <div data-testid="mock-article-detail">Article Detail</div>,
}));
vi.mock('../features/briefing/BriefingView', () => ({
  default: ({ isLoading }: any) => (
    <div data-testid="mock-briefing">{isLoading ? 'Loading...' : 'Briefing View'}</div>
  ),
}));
vi.mock('../features/search/SearchList', () => ({
  default: () => <div data-testid="mock-search-list">Search List</div>,
}));
vi.mock('../features/stream/StreamView', () => ({
  default: () => <div data-testid="mock-stream-list">Stream List</div>,
}));
vi.mock('../features/trends/TrendsPage', () => ({
  default: () => <div data-testid="mock-trends-page">Trends Page</div>,
}));
vi.mock('../common/ui/Spinner', () => ({
  default: () => <div data-testid="mock-spinner">Loading Spinner</div>,
}));

// Mock Hooks that trigger network requests
// We don't want real network requests in this test, but we DO want the effect logic to run.
// The effect logic uses queryClient.setQueryData directly, so we need a real QueryClient.
// However, 'useBriefingArticles' hook will also try to fetch. Let's mock it to return stale/empty data.
vi.mock('../../hooks/useArticles', () => ({
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
vi.mock('../../hooks/useArticleStateHydration', () => ({
  useArticleStateHydration: vi.fn(),
}));

describe('MainContentClient Integration (Cross-Day Hydration)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset Stores
    useUIStore.setState({ activeFilter: null, timeSlot: null, selectedArticleId: null });
    useArticleStore.setState({ articlesById: {} });

    // Mock Date to be "Today" (2026-01-03)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-03T10:00:00+08:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('SHOULD NOT hydrate initialArticles into cache if client date (Today) differs from server date (Yesterday)', async () => {
    // Scenario:
    // Client Time: 2026-01-03 ("Today")
    // SSR Props: initialDate="2026-01-02" ("Yesterday"), with some articles
    // Expected: The component calculates dateToUse="2026-01-03", which !== initialDate.
    //           Therefore, it MUST NOT inject the 01-02 articles into the 'briefing', '2026-01-03' cache key.

    const yesterday = '2026-01-02';
    const today = '2026-01-03';

    const mockInitialArticles: any[] = [
      { id: '1', title: 'Yesterday News', n8n_processing_date: `${yesterday}T12:00:00Z` },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <MainContentClient
          initialDate={yesterday}
          initialArticles={mockInitialArticles} // These belong to yesterday!
          // Force client to think it's viewing "Today" (01-03), while SSR gave "Yesterday" (01-02)
          initialActiveFilter={{ type: 'date', value: today }}
          isHomepage={true}
        />
      </QueryClientProvider>,
    );

    // Assert: Check Query Cache for TODAY'S key
    // The component defaults to showing "Today" (Briefing View)
    expect(screen.getByTestId('mock-briefing')).toBeInTheDocument();

    // CRITICAL CHECK: The cache for Today should be EMPTY (undefined)
    // because we prevented the pollution.
    const todayCache = queryClient.getQueryData(['briefing', today, 'all']);
    expect(todayCache).toBeUndefined();

    // Verify: The cache for Yesterday is also not set (because we didn't ask for yesterday view)
    // Actually, logic only sets cache if dateToUse matches.
  });

  it('SHOULD hydrate initialArticles if client date matches server date (Normal Case)', async () => {
    // Scenario: Normal hydration (SSR matches Client)
    const today = '2026-01-03';

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
        />
      </QueryClientProvider>,
    );

    // Assert: Check Query Cache for TODAY'S key
    const todayCache = queryClient.getQueryData(['briefing', today, 'all']);
    expect(todayCache).toEqual(['2']); // Should contain the ID
  });

  it('SHOULD NOT hydrate if active filter overrides date (e.g. Search Mode)', async () => {
    // Scenario: User accesses a Search URL directly
    // SSR might return some initialDate/articles, but activeFilter is 'search'
    const today = '2026-01-03';

    // Set store state to simulate Search Mode active
    useUIStore.setState({ activeFilter: { type: 'search', value: 'AI' } });

    render(
      <QueryClientProvider client={queryClient}>
        <MainContentClient
          initialDate={today}
          initialArticles={[{ id: '3', title: 'Unused' } as any]}
          initialActiveFilter={{ type: 'search', value: 'AI' }}
          isHomepage={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('mock-search-list')).toBeInTheDocument();

    // Assert: Briefing cache should not be touched
    const briefingCache = queryClient.getQueryData(['briefing', today, 'all']);
    expect(briefingCache).toBeUndefined();
  });
});
