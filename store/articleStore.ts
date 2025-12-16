// src/store/articleStore.ts

import { create } from 'zustand';
import { Article, AvailableFilters } from '../types';
import { STAR_TAG, READ_TAG } from '../constants';

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

const isUserTag = (tagId: string) =>
  !tagId.includes('/state/com.google/') && !tagId.includes('/state/org.freshrss/');

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
      const oldUserTags = new Set((oldArticle?.tags || []).filter(isUserTag));
      const newUserTags = new Set((updatedArticle.tags || []).filter(isUserTag));

      const tagsToAdd = [...newUserTags].filter((t) => !oldUserTags.has(t));
      const tagsToRemove = [...oldUserTags].filter((t) => !newUserTags.has(t));

      let newAvailableTags = [...state.availableFilters.tags];

      if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
        // 1. Identify which tags are TRULY new to the available list
        const existingTagIds = new Set(newAvailableTags.map((t) => t.id));
        const brandNewTags = tagsToAdd.filter((id) => !existingTagIds.has(id));

        // 2. Append brand new tags to the list with initial count 0 (count will be incremented below)
        brandNewTags.forEach((id) => {
          const label = decodeURIComponent(id.split('/').pop() || id);
          newAvailableTags.push({ id, label, count: 0 });
        });

        // 3. Update counts for all affected tags
        newAvailableTags = newAvailableTags.map((tag) => {
          const newTag = { ...tag };
          if (tagsToAdd.includes(newTag.id)) {
            newTag.count = (newTag.count || 0) + 1;
          }
          if (tagsToRemove.includes(newTag.id)) {
            newTag.count = Math.max(0, (newTag.count || 0) - 1);
          }
          return newTag;
        });
      }

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
