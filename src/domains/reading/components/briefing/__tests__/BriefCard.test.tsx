import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArticleCard from '../BriefCard'; // Default export is ArticleCard
import { Article } from '@/shared/types';

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

describe('文章卡片渲染与 SEO 结构 (ArticleCard/BriefCard)', () => {
  it('应当渲染 SEO 友好的零交互语义链接 (Zero-Interaction Link)', async () => {
    const mockOnReaderModeRequest = vi.fn();
    const mockOnStateChange = vi.fn();

    render(
      <ArticleCard
        article={mockArticle}
        onReaderModeRequest={mockOnReaderModeRequest}
        onStateChange={mockOnStateChange}
      />,
    );

    // 验证: 存在一个唯一的、可见的标题链接
    const link = screen.getByRole('link', { name: mockArticle.title });
    expect(link).toBeInTheDocument();

    // 验证: 不再使用 sr-only 隐藏
    expect(link).not.toHaveClass('sr-only');
    expect(link).not.toHaveAttribute('aria-hidden');

    // 验证: 具有正确的 href
    expect(link).toHaveAttribute('href', expect.stringContaining(mockArticle.id.toString()));

    // 验证: 关键属性 - 禁止拖拽 (draggable="false")
    expect(link).toHaveAttribute('draggable', 'false');
  });
});
