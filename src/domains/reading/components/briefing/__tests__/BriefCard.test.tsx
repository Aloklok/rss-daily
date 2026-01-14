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
  it('应当正确渲染视觉标题与隐藏的 SEO 链接', async () => {
    const mockOnReaderModeRequest = vi.fn();
    const mockOnStateChange = vi.fn();

    render(
      <ArticleCard
        article={mockArticle}
        onReaderModeRequest={mockOnReaderModeRequest}
        onStateChange={mockOnStateChange}
      />,
    );

    // 1. 验证视觉文本容器是否存在 (aria-hidden 为 true)
    const visualTitle = screen.getAllByText(mockArticle.title)[0];
    expect(visualTitle).toBeInTheDocument();
    expect(visualTitle).toHaveAttribute('aria-hidden', 'true');

    // 2. 验证 SEO 专用 Link 是否存在 (具有 sr-only 类)
    const seoLink = screen.getByRole('link', { name: mockArticle.title });
    expect(seoLink).toBeInTheDocument();
    expect(seoLink).toHaveClass('sr-only');
    expect(seoLink).toHaveAttribute('href', expect.stringContaining(mockArticle.id.toString()));
  });
});
