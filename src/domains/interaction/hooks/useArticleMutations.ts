import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  editArticleTag,
  editArticleState,
  markAllAsRead as apiMarkAllAsRead,
} from '@/domains/interaction/services/interactionClient';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useToastStore } from '@/shared/store/toastStore';

// --- Mutation Hooks ---

// 1. 更新文章状态 (标签、收藏、已读) - 非乐观更新版本
export const useUpdateArticleState = () => {
  const queryClient = useQueryClient();
  const updateArticle = useArticleStore((state) => state.updateArticle);
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: async ({
      articleId,
      tagsToAdd,
      tagsToRemove,
    }: {
      articleId: string | number;
      tagsToAdd: string[];
      tagsToRemove: string[];
    }) => {
      // 2. 【增加】创建一个数组来收集所有需要执行的 promise
      const apiPromises: Promise<any>[] = [];

      // --- 处理状态标签 (收藏/已读) ---
      const stateTagsToAdd = tagsToAdd.filter((t) => t.startsWith('user/-/state'));
      const stateTagsToRemove = tagsToRemove.filter((t) => t.startsWith('user/-/state'));

      for (const tag of stateTagsToAdd) {
        if (tag.includes('starred')) apiPromises.push(editArticleState(articleId, 'star', true));
        if (tag.includes('read')) apiPromises.push(editArticleState(articleId, 'read', true));
      }
      for (const tag of stateTagsToRemove) {
        if (tag.includes('starred')) apiPromises.push(editArticleState(articleId, 'star', false));
        if (tag.includes('read')) apiPromises.push(editArticleState(articleId, 'read', false));
      }

      // --- 处理用户自定义标签 ---
      const userTagsToAdd = tagsToAdd.filter((t) => !t.startsWith('user/-/state'));
      const userTagsToRemove = tagsToRemove.filter((t) => !t.startsWith('user/-/state'));

      if (userTagsToAdd.length > 0 || userTagsToRemove.length > 0) {
        apiPromises.push(editArticleTag(articleId, userTagsToAdd, userTagsToRemove));
      }

      // 3. 【修改】使用 Promise.all 来并行执行所有 API 请求
      // 只有当所有请求都成功时，才会继续往下执行
      await Promise.all(apiPromises);

      // Access CURRENT store state inside the mutation function to avoid stale closures
      const articlesById = useArticleStore.getState().articlesById;
      const articleToUpdate = articlesById[articleId];
      if (!articleToUpdate) throw new Error('Article not found in store');

      const finalTagsSet = new Set(articleToUpdate.tags || []);
      tagsToAdd.forEach((tag) => finalTagsSet.add(tag));
      tagsToRemove.forEach((tag) => finalTagsSet.delete(tag));
      return { ...articleToUpdate, tags: Array.from(finalTagsSet) };
    },
    onSuccess: (updatedArticle, variables) => {
      updateArticle(updatedArticle);

      // 【Toast Notification Logic Moved to Hook】
      const userTagsToAdd = variables.tagsToAdd.filter((t) => !t.startsWith('user/-/state'));
      const userTagsToRemove = variables.tagsToRemove.filter((t) => !t.startsWith('user/-/state'));

      if (userTagsToAdd.length > 0 || userTagsToRemove.length > 0) {
        const extractLabel = (tag: string) => decodeURIComponent(tag.split('/').pop() || tag);
        const added = userTagsToAdd.map(extractLabel).join(', ');
        const removed = userTagsToRemove.map(extractLabel).join(', ');
        let message = '';
        if (added) message += `成功添加标签: ${added} `;
        if (removed) message += `${added ? ' ' : ''} 成功移除标签: ${removed} `;
        showToast(message.trim(), 'success');
      }

      // B. Keep tag-based revalidation for SEO/Aggregator pages
      const touchedTags = new Set([...variables.tagsToAdd, ...variables.tagsToRemove]);
      touchedTags.forEach((tag) => {
        fetch(`/api/system/revalidate?tag=${encodeURIComponent(tag)}`).catch((err) =>
          console.warn(`[Revalidate] Failed to trigger for ${tag}`, err),
        );
      });

      // 【Optimization】Manual Cache Update for Sidebar
      const isStarred = updatedArticle.tags.includes('user/-/state/com.google/starred');

      queryClient.setQueryData<any[]>(['starredHeaders'], (oldData) => {
        if (!oldData) return oldData;

        if (isStarred) {
          const exists = oldData.some((item) => item.id === updatedArticle.id);
          if (!exists) {
            return [
              {
                id: updatedArticle.id,
                title: updatedArticle.title,
                tags: updatedArticle.tags,
              },
              ...oldData,
            ];
          }
          return oldData.map((item) =>
            item.id === updatedArticle.id ? { ...item, tags: updatedArticle.tags } : item,
          );
        } else {
          return oldData.filter((item) => item.id !== updatedArticle.id);
        }
      });
    },
    onError: (err) => {
      console.error('Failed to update article state:', err);
      showToast(err instanceof Error ? err.message : '更新文章状态失败', 'error');
    },
  });
};

// 2. 批量标记已读
export const useMarkAllAsRead = () => {
  const markArticlesAsRead = useArticleStore((state) => state.markArticlesAsRead);
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (variables: { articleIds: (string | number)[]; date?: string }) =>
      apiMarkAllAsRead(variables.articleIds).then((ids) => ({ ids, date: variables.date })),
    onSuccess: (result) => {
      const markedIds = result.ids;
      if (!markedIds || markedIds.length === 0) return;

      markArticlesAsRead(markedIds);
      showToast(`已将 ${markedIds.length} 篇文章设为已读`, 'success');
    },
    onError: (err) => {
      console.error('Failed to mark as read:', err);
      showToast(err instanceof Error ? err.message : '标记已读失败', 'error');
    },
  });
};
