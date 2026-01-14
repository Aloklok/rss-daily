import { describe, it, expect, beforeEach } from 'vitest';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { STAR_TAG, READ_TAG } from '@/domains/interaction/constants';
import { Article } from '@/shared/types';

// Helper to reset store
const initialState = useArticleStore.getState();

describe('articleStore (文章状态管理)', () => {
  beforeEach(() => {
    useArticleStore.setState(initialState, true);
  });

  const sampleArticle: Article = {
    id: '1',
    title: 'Test Article',
    tags: [],
    // ... minimal required fields
    link: '',
    sourceName: '',
    published: '',
    created_at: '',
    briefingSection: '',
    keywords: [],
    verdict: { type: '', score: 0 },
    category: 'tech',
    summary: '',
    tldr: '',
    highlights: '',
    critiques: '',
    marketTake: '',
  };

  describe('markArticlesAsRead (标记已读)', () => {
    it('应为文章添加 READ_TAG', () => {
      // 1. Setup store with an article
      useArticleStore.getState().addArticles([sampleArticle]);

      // 2. Mark as read
      useArticleStore.getState().markArticlesAsRead(['1']);

      const updatedDiff = useArticleStore.getState().articlesById['1'];
      expect(updatedDiff.tags).toContain(READ_TAG);
    });

    it('如果已包含 READ_TAG，不应重复添加', () => {
      const readArticle = { ...sampleArticle, tags: [READ_TAG] };
      useArticleStore.getState().addArticles([readArticle]);

      useArticleStore.getState().markArticlesAsRead(['1']);

      const updatedDiff = useArticleStore.getState().articlesById['1'];
      // Should still only have one READ_TAG
      expect(updatedDiff.tags?.filter((t) => t === READ_TAG).length).toBe(1);
    });
  });

  describe('updateArticle (收藏逻辑)', () => {
    it('当添加 STAR_TAG 时，应将 ID 加入 starredArticleIds', () => {
      useArticleStore.getState().addArticles([sampleArticle]);

      const starredVersion = { ...sampleArticle, tags: [STAR_TAG] };
      useArticleStore.getState().updateArticle(starredVersion);

      const state = useArticleStore.getState();
      // Article updated?
      expect(state.articlesById['1'].tags).toContain(STAR_TAG);
      // ID in list?
      expect(state.starredArticleIds).toContain('1');
    });

    it('当移除 STAR_TAG 时，应将 ID 从 starredArticleIds 移除', () => {
      // Setup: Article is initially starred
      const starredArticle = { ...sampleArticle, tags: [STAR_TAG] };
      useArticleStore.getState().addArticles([starredArticle]);
      // Manually sync the starred list for setup (since addArticles doesn't automatically sync that aux list in this simple store impl, usually done by fetchers.
      // Wait, addArticles DOES NOT sync starredArticleIds. updateArticle DOES.
      // So let's use updateArticle to set it up properly or manually set state.
      useArticleStore.setState({ starredArticleIds: ['1'] });

      // Action: Unstar
      const unstarredVersion = { ...sampleArticle, tags: [] };
      useArticleStore.getState().updateArticle(unstarredVersion);

      const state = useArticleStore.getState();
      expect(state.articlesById['1'].tags).not.toContain(STAR_TAG);
      expect(state.starredArticleIds).not.toContain('1');
    });
  });
});
