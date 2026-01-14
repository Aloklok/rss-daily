// src/store/articleStore.ts

import { create } from 'zustand';
import { Article, AvailableFilters } from '@/shared/types';
import { STAR_TAG, READ_TAG } from '@/domains/interaction/constants';
import { calculateNewAvailableTags } from '@/shared/utils/tagUtils';

interface ArticleStoreState {
  articlesById: Record<string | number, Article>;
  starredArticleIds: (string | number)[];
  availableFilters: AvailableFilters;

  // Actions
  addArticles: (articles: Article[]) => void;
  updateArticle: (updatedArticle: Article) => void;
  markArticlesAsRead: (ids: (string | number)[]) => void;
  setStarredArticleIds: (ids: (string | number)[]) => void;
  setAvailableFilters: (filters: AvailableFilters) => void;
}

export const useArticleStore = create<ArticleStoreState>((set, get) => ({
  articlesById: {},
  starredArticleIds: [],
  availableFilters: { categories: [], tags: [] },

  addArticles: (articles) => {
    if (!articles || articles.length === 0) return;
    set((state) => {
      const newArticlesById = { ...state.articlesById };
      articles.forEach((article) => {
        newArticlesById[article.id] = { ...state.articlesById[article.id], ...article };
      });
      return { articlesById: newArticlesById };
    });
  },

  updateArticle: (updatedArticle) => {
    const oldArticle = get().articlesById[updatedArticle.id];
    const wasStarred = get().articlesById[updatedArticle.id]?.tags?.includes(STAR_TAG);
    const isNowStarred = updatedArticle.tags?.includes(STAR_TAG);

    set((state) => {
      const newArticlesById = { ...state.articlesById, [updatedArticle.id]: updatedArticle };
      let newStarredArticleIds = [...state.starredArticleIds];
      if (isNowStarred && !wasStarred) {
        newStarredArticleIds = [updatedArticle.id, ...newStarredArticleIds];
      } else if (!isNowStarred && wasStarred) {
        newStarredArticleIds = newStarredArticleIds.filter((id) => id !== updatedArticle.id);
      }

      // --- Dynamic Tag Count Update ---
      const newAvailableTags = calculateNewAvailableTags(
        state.availableFilters.tags,
        oldArticle?.tags,
        updatedArticle.tags,
      );

      return {
        articlesById: newArticlesById,
        starredArticleIds: newStarredArticleIds,
        availableFilters: {
          ...state.availableFilters,
          tags: newAvailableTags,
        },
      };
    });
  },

  markArticlesAsRead: (idsToMark) => {
    if (!idsToMark || idsToMark.length === 0) return;

    set((state) => {
      const newArticlesById = { ...state.articlesById };
      let hasChanged = false;

      idsToMark.forEach((id) => {
        const article = newArticlesById[id];
        if (article && !article.tags?.includes(READ_TAG)) {
          newArticlesById[id] = {
            ...article,
            tags: [...(article.tags || []), READ_TAG],
          };
          hasChanged = true;
        }
      });

      return hasChanged ? { articlesById: newArticlesById } : {};
    });
  },

  setStarredArticleIds: (ids) => {
    set({ starredArticleIds: ids });
  },

  setAvailableFilters: (filters) => set({ availableFilters: filters }),
}));
