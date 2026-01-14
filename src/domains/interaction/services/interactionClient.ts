// Interaction Domain - Client API Functions (Mutations)
// Extracted from src/services/clientApi.ts

import { apiClient } from '@/shared/infrastructure/api/apiClient';

/**
 * Marks multiple articles as read.
 */
export const markAllAsRead = (articleIds: (string | number)[]): Promise<(string | number)[]> => {
  if (!articleIds || articleIds.length === 0) return Promise.resolve([]);

  return apiClient
    .request<void>('/api/articles/state', {
      method: 'POST',
      body: { articleIds, action: 'read', isAdding: true },
    })
    .then(() => articleIds);
};

/**
 * Edits a single article's star or read state.
 */
export const editArticleState = (
  articleId: string | number,
  action: 'star' | 'read',
  isAdding: boolean,
): Promise<void> => {
  return apiClient.request<void>('/api/articles/state', {
    method: 'POST',
    body: { articleId, action, isAdding },
  });
};

/**
 * Edits an article's custom tags.
 */
export const editArticleTag = async (
  articleId: string | number,
  tagsToAdd: string[],
  tagsToRemove: string[],
): Promise<void> => {
  await apiClient.request<void>('/api/articles/state', {
    method: 'POST',
    body: {
      articleId,
      tagsToAdd: tagsToAdd,
      tagsToRemove: tagsToRemove,
    },
  });
};
