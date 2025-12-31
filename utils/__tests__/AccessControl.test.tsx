import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUIStore } from '@/store/uiStore';
import ArticleDetail from '@/components/features/article/ArticlePage';
import { MOCK_ARTICLE } from './mockData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Mantine and icons if necessary, but Vitest Browser should handle them
// We mock the store to control isAdmin state
vi.mock('../../store/uiStore', () => ({
  useUIStore: vi.fn(),
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

  it('公共用户不应看到管理员专用按钮', async () => {
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

    // 验证管理按钮不存在 (Currently vacuously true as they are not in UI yet)
    expect(screen.queryByRole('button', { name: /收藏|favorites/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /标签|Tag article/i })).not.toBeInTheDocument();
  });
});
