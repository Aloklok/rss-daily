import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArticleActions } from '@/domains/interaction/hooks/useArticleActions';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { STAR_TAG, READ_TAG } from '@/domains/interaction/constants';
import { MOCK_ARTICLE } from '@/e2e/mocks/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the API calls
const mockEditArticleState = vi.fn();
const mockEditArticleTag = vi.fn();

vi.mock('@/domains/interaction/services/interactionClient', () => ({
  editArticleState: (...args: any[]) => mockEditArticleState(...args),
  editArticleTag: (...args: any[]) => mockEditArticleTag(...args),
  markAllAsRead: vi.fn(),
}));

vi.mock('@/domains/reading/services/readingClient', () => ({
  getRawStarredArticles: vi.fn(),
  getAvailableDates: vi.fn(),
  getArticlesDetails: vi.fn(),
  markAllAsRead: vi.fn(),
  getCleanArticleContent: vi.fn(),
  getArticleStates: vi.fn().mockResolvedValue({}),
  getArticlesByLabel: vi.fn(),
  getAvailableFilters: vi.fn(),
  getDailyStatuses: vi.fn(),
  updateDailyStatus: vi.fn(),
  searchArticlesByKeyword: vi.fn(),
  getCurrentTimeSlotInShanghai: () => 'morning',
}));

// Setup QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe('useArticleActions (文章操作集成测试)', () => {
  const sampleArticle = MOCK_ARTICLE;
  const articleId = String(sampleArticle.id);

  beforeEach(() => {
    vi.clearAllMocks();
    useArticleStore.getState().addArticles([sampleArticle]);
    // Reset tags
    useArticleStore.setState((state) => ({
      articlesById: {
        ...state.articlesById,
        [articleId]: { ...sampleArticle, tags: [] },
      },
    }));
  });

  it('收藏操作：应调用 API 并更新 Store', async () => {
    mockEditArticleState.mockResolvedValue({});

    const { result } = renderHook(() => useArticleActions(), { wrapper });

    await act(async () => {
      await result.current.handleArticleStateChange(articleId, [STAR_TAG], []);
    });

    // 验证 API 调用
    expect(mockEditArticleState).toHaveBeenCalledWith(articleId, 'star', true);

    // 验证 Store 更新
    const updatedArticle = useArticleStore.getState().articlesById[articleId];
    expect(updatedArticle.tags).toContain(STAR_TAG);
  });

  it('取消收藏操作：应调用 API 并从 Store 移除标签', async () => {
    // Initial state: starred
    useArticleStore.setState((state) => ({
      articlesById: {
        ...state.articlesById,
        [articleId]: { ...sampleArticle, tags: [STAR_TAG] },
      },
    }));

    mockEditArticleState.mockResolvedValue({});

    const { result } = renderHook(() => useArticleActions(), { wrapper });

    await act(async () => {
      await result.current.handleArticleStateChange(articleId, [], [STAR_TAG]);
    });

    expect(mockEditArticleState).toHaveBeenCalledWith(articleId, 'star', false);

    const updatedArticle = useArticleStore.getState().articlesById[articleId];
    expect(updatedArticle.tags).not.toContain(STAR_TAG);
  });

  it('标记已读操作：应调用 API 并更新 Store', async () => {
    mockEditArticleState.mockResolvedValue({});

    const { result } = renderHook(() => useArticleActions(), { wrapper });

    await act(async () => {
      await result.current.handleArticleStateChange(articleId, [READ_TAG], []);
    });

    expect(mockEditArticleState).toHaveBeenCalledWith(articleId, 'read', true);

    const updatedArticle = useArticleStore.getState().articlesById[articleId];
    expect(updatedArticle.tags).toContain(READ_TAG);
  });

  it('打标签操作：应调用 API 并更新 Store', async () => {
    const customTag = 'user/Alok/label/TypeScript';
    mockEditArticleTag.mockResolvedValue({});

    const { result } = renderHook(() => useArticleActions(), { wrapper });

    await act(async () => {
      await result.current.handleArticleStateChange(articleId, [customTag], []);
    });

    expect(mockEditArticleTag).toHaveBeenCalledWith(articleId, [customTag], []);

    const updatedArticle = useArticleStore.getState().articlesById[articleId];
    expect(updatedArticle.tags).toContain(customTag);
  });

  it('移除标签操作：应调用 API 并从 Store 移除自定义标签', async () => {
    const customTag = 'user/Alok/label/TypeScript';
    useArticleStore.setState((state) => ({
      articlesById: {
        ...state.articlesById,
        [articleId]: { ...sampleArticle, tags: [customTag] },
      },
    }));

    mockEditArticleTag.mockResolvedValue({});

    const { result } = renderHook(() => useArticleActions(), { wrapper });

    await act(async () => {
      await result.current.handleArticleStateChange(articleId, [], [customTag]);
    });

    expect(mockEditArticleTag).toHaveBeenCalledWith(articleId, [], [customTag]);

    const updatedArticle = useArticleStore.getState().articlesById[articleId];
    expect(updatedArticle.tags).not.toContain(customTag);
  });
});
