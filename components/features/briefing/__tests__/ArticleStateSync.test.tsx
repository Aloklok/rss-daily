import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticleCard from '../BriefCard';
import { MOCK_ARTICLE } from '../../../../e2e/mocks/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock useUIStore
vi.mock('../../../../store/uiStore', () => ({
    useUIStore: (selector: any) => {
        const state = { isAdmin: true };
        return selector(state);
    },
}));

// Mock useArticleActions
vi.mock('../../../../hooks/useArticleActions', () => ({
    useArticleActions: () => ({
        handleArticleStateChange: vi.fn(),
        handleMarkAllClick: vi.fn(),
        isUpdatingArticle: false,
        isMarkingAsRead: false,
    }),
}));

const queryClient = new QueryClient();

describe('ArticleCard State Toggle (Vitest Browser)', () => {
    beforeEach(() => {
        cleanup();
    });

    it('点击收藏按钮应该是调用 onStateChange', async () => {
        const user = userEvent.setup();
        const onStateChange = vi.fn().mockResolvedValue(undefined);
        const onReaderModeRequest = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <ArticleCard
                    article={MOCK_ARTICLE}
                    onReaderModeRequest={onReaderModeRequest}
                    onStateChange={onStateChange}
                />
            </QueryClientProvider>
        );

        // 验证标题渲染
        expect(screen.getByText(MOCK_ARTICLE.title)).toBeInTheDocument();

        // 查找收藏按钮 (处理响应式重复)
        // 使用 getAllByRole 并过滤可见的，或者直接点击第一个符合条件的
        const starButtons = screen.getAllByRole('button', { name: /收藏/ });
        expect(starButtons.length).toBeGreaterThan(0);

        // 点击第一个按钮 (通常是桌面端或移动端视口内的一个)
        await user.click(starButtons[0]);

        // 验证 onStateChange 被调用
        expect(onStateChange).toHaveBeenCalled();
    });
});

// FloatingActionButtons interaction is covered by components/features/briefing/__tests__/MarkAllRead.test.tsx
