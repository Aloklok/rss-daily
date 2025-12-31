import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleCard from '../BriefCard'; // Default export is ArticleCard
import { Article } from '../../../../types';

// Mock props
const mockArticle: Article = {
  id: 'test-id-1',
  title: 'Test Article Title',
  sourceName: 'Test Source',
  published: '2023-01-01',
  link: 'https://example.com/article',
  summary: 'Summary text',
  highlights: 'Highlights text',
  critiques: 'Critiques text',
  marketTake: 'Market take text',
  verdict: { type: 'buy', score: 8 },
  category: 'Tech',
  keywords: ['AI', 'Testing'],
  // ... other fields if necessary
} as Article;

describe('文章卡片交互 (ArticleCard/BriefCard)', () => {
  it('点击标题链接时应触发 阅读模式 (onReaderModeRequest)', async () => {
    const user = userEvent.setup();
    const mockOnReaderModeRequest = vi.fn();
    const mockOnStateChange = vi.fn();

    render(
      <ArticleCard
        article={mockArticle}
        onReaderModeRequest={mockOnReaderModeRequest}
        onStateChange={mockOnStateChange}
      />,
    );

    // Find the link by text or testid
    const link = screen.getByRole('link', { name: /Test Article Title/i });

    // Check if it prevents default (navigation) and calls handler
    // In JSDOM, clicking a link might not navigate, but we can verify the handler.
    await user.click(link);

    expect(mockOnReaderModeRequest).toHaveBeenCalledTimes(1);
    expect(mockOnReaderModeRequest).toHaveBeenCalledWith(mockArticle);
  });
});
