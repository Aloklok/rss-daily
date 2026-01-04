import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';
import { useUIStore } from '@/store/uiStore';
import ArticleDetail from '@/components/features/article/ArticlePage';
import FloatingActionButtons from '@/components/layout/FloatingActionButtons';
import AIChatModal from '@/components/features/ai/AIChatModal';
import { MOCK_ARTICLE } from './mockData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChatStore } from '@/store/chatStore';

// We mock the store to control isAdmin state
vi.mock('../../store/uiStore', () => ({
  useUIStore: vi.fn(),
}));

// Mocks for Floating Action Buttons dependencies
vi.mock('../../hooks/useArticleMetadata', () => ({
  useArticleMetadata: () => ({ isStarred: false, userTagLabels: [] }),
}));
vi.mock('../../hooks/useArticleActions', () => ({
  useArticleActions: () => ({
    handleArticleStateChange: vi.fn(),
    handleMarkAllClick: vi.fn(),
    isUpdatingArticle: false,
    isMarkingAsRead: false,
  }),
}));
vi.mock('../../hooks/useArticles', () => ({
  useBriefingArticles: () => ({ data: [], isFetching: false }),
  useFilteredArticles: () => ({ data: null }),
  useSearchResults: () => ({ data: null }),
}));
vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => ({ handleResetFilter: vi.fn() }),
}));
vi.mock('../../services/clientApi', () => ({
  getCurrentTimeSlotInShanghai: () => 'morning',
  getCleanArticleContent: vi.fn(),
  getArticlesDetails: vi.fn(), // Might be needed too
}));
// ChatStore mock for AIChatModal
vi.mock('../../store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('AccessControl 组件级权限验证', () => {
  const mockArticle = {
    ...MOCK_ARTICLE,
    id: 'test-id',
  };

  it('所有用户应能看到通用按钮 (复制/原文)', async () => {
    // 模拟管理员状态
    (useUIStore as any).mockImplementation((selector: any) =>
      selector({ isAdmin: true, setModalArticleId: vi.fn() }),
    );

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ArticleDetail article={mockArticle as any} />
      </QueryClientProvider>,
    );

    // 验证通用按钮存在 (Copy & Original)
    expect(screen.getByTitle(/复制全文/i)).toBeInTheDocument();
    expect(screen.getByTitle(/打开原文/i)).toBeInTheDocument();
  });

  it('公共用户不应看到管理员专用按钮 (ArticleDetail)', async () => {
    // 模拟普通用户状态
    (useUIStore as any).mockImplementation((selector: any) =>
      selector({ isAdmin: false, setModalArticleId: vi.fn() }),
    );

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ArticleDetail article={mockArticle as any} />
      </QueryClientProvider>,
    );

    // 验证管理按钮不存在
    expect(screen.queryByRole('button', { name: /收藏|favorites/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /标签|Tag article/i })).not.toBeInTheDocument();
  });

  describe('AI 助手权限控制 (AI Assistant Access)', () => {
    it('公共用户不应看到 AI 入口按钮 (FloatingActionButtons)', () => {
      // Mock UI Store for FloatingActionButtons selectors
      (useUIStore as any).mockImplementation((selector: any) =>
        selector({
          activeFilter: null,
          selectedArticleId: null,
          timeSlot: null,
          verdictFilter: null,
          // isAdmin is passed as prop to FAB, but store mock handles hooks inside
        }),
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <FloatingActionButtons isAdmin={false} />
        </QueryClientProvider>,
      );

      const aiButton = screen.queryByLabelText('Open AI Assistant');
      expect(aiButton).not.toBeInTheDocument();
    });

    it('管理员应看到 AI 入口按钮 (FloatingActionButtons)', () => {
      (useUIStore as any).mockImplementation((selector: any) =>
        selector({
          activeFilter: null,
          selectedArticleId: null,
          timeSlot: null,
          verdictFilter: null,
        }),
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <FloatingActionButtons isAdmin={true} />
        </QueryClientProvider>,
      );

      const aiButton = screen.getByLabelText('Open AI Assistant');
      expect(aiButton).toBeInTheDocument();
    });

    it('非管理员即使强制打开也不应渲染 AI 对话框 (AIChatModal)', () => {
      // UI Store: Not admin
      (useUIStore as any).mockImplementation(
        (selector: any) => selector({ isAdmin: false, openModal: vi.fn() }), // Add openModal mock for AIChatModal
      );

      // Chat Store: Force open
      (useChatStore as any).mockImplementation((selector?: any) => {
        const state = {
          isOpen: true,
          messages: [],
          setIsOpen: vi.fn(),
          addMessage: vi.fn(),
          // mock other required state
          isStreaming: false,
          streamingContent: '',
          searchGroundingEnabled: false,
          selectedModel: 'gemini-test',
          isExpanded: false,
          setIsExpanded: vi.fn(),
          toggleSearchGrounding: vi.fn(),
          setSelectedModel: vi.fn(),
          clearHistory: vi.fn(),
          setStreaming: vi.fn(),
          openModal: vi.fn(), // If used
        };
        return selector ? selector(state) : state;
      });

      const queryClient = createTestQueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <AIChatModal />
        </QueryClientProvider>,
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
