// src/store/articleStore.ts

import { create } from 'zustand';
import { create } from 'zustand';
import { Article, Filter, AvailableFilters, Tag } from '../types';
import { STAR_TAG, READ_TAG } from '../api/constants'; // Import STAR_TAG and READ_TAG

const getTodayInShanghai = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'
  });
  return formatter.format(new Date());
};
const getCurrentTimeSlotInShanghai = (): 'morning' | 'afternoon' | 'evening' => {
  const now = new Date();
  const hour = parseInt(new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  }).format(now), 10);

  if (hour < 12) return 'morning';
  if (hour < 19) return 'afternoon';
  return 'evening';
};

interface ArticleStoreState {
  articlesById: Record<string | number, Article>;
  starredArticleIds: (string | number)[]; // 【修改】从 Set 改为 Array
  activeFilter: Filter | null;
  // 1. 【新增】模态框的初始模式 ('briefing' | 'reader')
  modalInitialMode: 'briefing' | 'reader';
  timeSlot: 'morning' | 'afternoon' | 'evening' | null; // 【增】
  selectedArticleId: string | number | null;
  availableFilters: AvailableFilters;
  modalArticleId: string | number | null;
  openModal: (id: string | number, mode?: 'briefing' | 'reader') => void;
  closeModal: () => void;
  setModalArticleId: (id: string | number | null) => void; // 兼容旧代码
  markArticlesAsRead: (ids: (string | number)[]) => void;
  addArticles: (articles: Article[]) => void;
  updateArticle: (updatedArticle: Article) => void;
  setStarredArticleIds: (ids: (string | number)[]) => void;
  setActiveFilter: (filter: Filter | null) => void;
  setSelectedArticleId: (id: string | number | null) => void;
  setAvailableFilters: (filters: AvailableFilters) => void;
  setTimeSlot: (slot: 'morning' | 'afternoon' | 'evening' | null) => void; // 【增】
}

const isUserTag = (tagId: string) => !tagId.includes('/state/com.google/') && !tagId.includes('/state/org.freshrss/');

export const useArticleStore = create<ArticleStoreState>((set, get) => ({
  articlesById: {},
  starredArticleIds: [], // 初始为空数组
  activeFilter: null,
  timeSlot: null, // 【增】
  selectedArticleId: null,
  modalArticleId: null,
  modalInitialMode: 'briefing',
  openModal: (id, mode: 'briefing' | 'reader' = 'briefing') => set({
    modalArticleId: id,
    modalInitialMode: mode
  }),

  closeModal: () => set({
    modalArticleId: null,
    modalInitialMode: 'briefing'
  }),
  // 兼容旧调用，默认走 briefing
  setModalArticleId: (id) => set({ modalArticleId: id, modalInitialMode: 'briefing' }),
  availableFilters: { categories: [], tags: [] },
  addArticles: (articles) => {
    if (!articles || articles.length === 0) return;
    set((state) => {
      const newArticlesById = { ...state.articlesById };
      articles.forEach(article => {
        newArticlesById[article.id] = { ...state.articlesById[article.id], ...article };
      });
      return { articlesById: newArticlesById };
    });
  },
  setTimeSlot: (slot) => set({ timeSlot: slot }), // 【增】
  updateArticle: (updatedArticle) => {
    const oldArticle = get().articlesById[updatedArticle.id];
    const wasStarred = get().articlesById[updatedArticle.id]?.tags?.includes(STAR_TAG);
    const isNowStarred = updatedArticle.tags?.includes(STAR_TAG);

    set((state) => {
      const newArticlesById = { ...state.articlesById, [updatedArticle.id]: updatedArticle };
      let newStarredArticleIds = [...state.starredArticleIds];
      if (isNowStarred && !wasStarred) {
        // 如果是新收藏的，添加到数组的最前面
        newStarredArticleIds = [updatedArticle.id, ...newStarredArticleIds];
      } else if (!isNowStarred && wasStarred) {
        // 如果是取消收藏，从数组中移除
        newStarredArticleIds = newStarredArticleIds.filter(id => id !== updatedArticle.id);
      }

      // --- 【核心逻辑】开始动态更新标签计数 ---
      const oldUserTags = new Set((oldArticle?.tags || []).filter(isUserTag));
      const newUserTags = new Set((updatedArticle.tags || []).filter(isUserTag));

      const tagsToAdd = [...newUserTags].filter(t => !oldUserTags.has(t));
      const tagsToRemove = [...oldUserTags].filter(t => !newUserTags.has(t));

      let newAvailableTags = [...state.availableFilters.tags];

      if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
        newAvailableTags = newAvailableTags.map(tag => {
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
      // --- 结束动态更新标签计数 ---

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
  // 3. 【增加】实现新的 markArticlesAsRead action
  markArticlesAsRead: (idsToMark) => {
    if (!idsToMark || idsToMark.length === 0) return;

    set((state) => {
      // 复制一份当前的 articlesById，以遵循不可变性原则
      const newArticlesById = { ...state.articlesById };
      let hasChanged = false; // 标记状态是否真的发生了变化

      idsToMark.forEach(id => {
        const article = newArticlesById[id];
        // 确保文章存在且尚未被标记为已读
        if (article && !article.tags?.includes(READ_TAG)) {
          // 创建一个新的 article 对象，并更新其 tags
          newArticlesById[id] = {
            ...article,
            tags: [...(article.tags || []), READ_TAG],
          };
          hasChanged = true;
        }
      });

      // 只有在至少一篇文章的状态被更新时，才返回新的 state 对象
      // 这可以避免不必要的组件重渲染
      return hasChanged ? { articlesById: newArticlesById } : {};
    });
  },
  setStarredArticleIds: (ids) => {
    // 当从 API 获取完整的收藏列表时，直接设置
    set({ starredArticleIds: ids });
  },

  setActiveFilter: (filter) => {
    let newTimeSlot: 'morning' | 'afternoon' | 'evening' | null = null;

    // 在 action 内部计算正确的 timeSlot
    if (filter?.type === 'date') {
      const today = getTodayInShanghai();
      if (filter.value === today) {
        // 如果是今天，计算当前时间槽
        newTimeSlot = getCurrentTimeSlotInShanghai();
      }
      // 对于历史日期，newTimeSlot 保持为 null (全天)
    }
    // 对于非日期过滤器，newTimeSlot 也保持为 null

    // 原子地更新 filter 和 timeSlot
    set({
      activeFilter: filter,
      selectedArticleId: null,
      timeSlot: newTimeSlot
    });
  },

  setSelectedArticleId: (id) => set({ selectedArticleId: id }),
  setAvailableFilters: (filters) => set({ availableFilters: filters }),
}));


export const selectSelectedArticle = (state: ArticleStoreState) => {
  if (!state.selectedArticleId) return null;
  return state.articlesById[state.selectedArticleId] || null;
};
