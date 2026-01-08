/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';
import { useUIStore } from '@/store/uiStore';
import ArticleDetail from '@/components/features/article/ArticlePage';
import FloatingActionButtons from '@/components/layout/FloatingActionButtons';
import AIChatModal from '@/components/features/ai/AIChatModal';
import { MOCK_ARTICLE } from './mockData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BackfillPanel from '@/components/features/admin/BackfillPanel';
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
// Mock server-side Gemini/Supabase client to prevent initialization error
vi.mock('../../lib/server/gemini', () => ({
  default: {},
  getSupabaseClient: vi.fn(),
  generateBriefingWithGemini: vi.fn(),
}));

vi.mock('../../store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

// Mock Server Actions used by BackfillPanel
vi.mock('@/app/actions/backfill', () => ({
  fetchBackfillCandidates: vi.fn(),
  generateBatchBriefing: vi.fn(),
  getSubscriptionList: vi.fn(),
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

  describe('管理后台路由保护 (Admin Route Protection)', () => {
    // 模拟 BriefingAdminPage 组件行为
    // 注意：实际的 Page 组件通常包含 redirect() 调用，这是 Server Component 逻辑。
    // 但在 Client Component 测试中，我们主要验证"即使渲染组件也不显示内容"或"触发重定向"。
    // 这里我们假设 BriefingAdminPage 内部有权限检查。
    // 如果是 Server Component，Browser Test 难以直接测试，通常 E2E 测试更合适。
    // 但用户要求在这里加，我们假设目标组件包含客户端权限检查逻辑。
    // 如果目标是纯 Server Component，我们可能需要测试其引用的 Client wrapper。

    // 假设我们要测试的是 BackfillPanel (这是 Client Component)

    it('非管理员无法查看补录面板 (BackfillPanel)', async () => {
      // 1. 模拟非管理员
      (useUIStore as any).mockImplementation((selector: any) => selector({ isAdmin: false }));

      const queryClient = createTestQueryClient();

      // 2. 尝试渲染 BackfillPanel
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BackfillPanel />
        </QueryClientProvider>,
      );

      // 3. 验证主要内容不渲染
      expect(container).toBeEmptyDOMElement();
    });
  });
});
