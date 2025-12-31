import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BriefingView from '../BriefingView';
import { MOCK_ARTICLES_POOL } from '../../../../e2e/mocks/data';

// 基础 Mock 数据生成器
const getMockProps = (slot: string | null = 'morning') => ({
    articleIds: Object.values(MOCK_ARTICLES_POOL)
        .filter(a => !slot || a.id.includes(slot))
        .map(a => a.id),
    date: '2025-01-01',
    timeSlot: slot as any,
    selectedReportId: 1,
    onReportSelect: vi.fn(),
    onReaderModeRequest: vi.fn(),
    onStateChange: vi.fn().mockResolvedValue(undefined),
    onTimeSlotChange: vi.fn(),
    articleCount: Object.values(MOCK_ARTICLES_POOL).filter(a => !slot || a.id.includes(slot)).length,
    isToday: true,
    articles: Object.values(MOCK_ARTICLES_POOL),
    verdictFilter: null,
    onVerdictFilterChange: vi.fn(),
});

describe('BriefingView 组件渲染与交互测试', () => {
    it('应该正确渲染传入 ID 对应的文章', async () => {
        const props = getMockProps('morning');
        render(<BriefingView {...props} />);

        // 验证早上的文章可见 (由于响应式架构，可能会存在多份 DOM)
        const morningTitles = screen.getAllByText(MOCK_ARTICLES_POOL.morning_insight.title);
        expect(morningTitles.length).toBeGreaterThan(0);

        // 验证中午的文章不应该在 dom 中 (因为我们在 props 里就没传它的 ID)
        const afternoonTitles = screen.queryAllByText(MOCK_ARTICLES_POOL.afternoon_insight.title);
        expect(afternoonTitles.length).toBe(0);
    });

    it('点击时段按钮应该触发 onTimeSlotChange 回调', async () => {
        const props = getMockProps('morning');
        render(<BriefingView {...props} />);

        const afternoonBtn = screen.getByTitle('中午');
        fireEvent.click(afternoonBtn);

        expect(props.onTimeSlotChange).toHaveBeenCalledWith('afternoon');
    });

    it('点击类型过滤器应该触发 onVerdictFilterChange 回调', async () => {
        const props = getMockProps('morning');
        render(<BriefingView {...props} />);

        const newsFilter = screen.getByTitle('时事新闻与更新');
        fireEvent.click(newsFilter);

        expect(props.onVerdictFilterChange).toHaveBeenCalled();
    });
});
