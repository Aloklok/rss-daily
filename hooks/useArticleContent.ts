import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArticleStore } from '../store/articleStore';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent } from '../services/clientApi';

export const useArticleContent = (
  article: Article,
  initialData?: CleanArticleContent | null,
  options?: { enabled?: boolean },
) => {
  const updateArticle = useArticleStore((state) => state.updateArticle);

  const query = useQuery({
    queryKey: ['article', 'content', article.id],
    // 【核心优化】获取内容的同时获取最新状态（消除闪烁）
    queryFn: () => getCleanArticleContent(article, { includeState: true }),
    enabled: options?.enabled !== false && !!article.id,
    initialData: initialData || undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // 【核心优化】同步聚合的状态到 Store
  // 当 API 返回了最新的 tags (aggregated state) 时，立即更新 Store，
  // 这样 UI (如 ArticleTitleStar) 就能即时反映出收藏/已读状态。
  useEffect(() => {
    if (query.data?.tags) {
      // 使用 getState 避免不必要的订阅重渲染
      const currentArticle = useArticleStore.getState().articlesById[article.id] || article;

      // 只有当标签确实有变化时才更新（可选优化，这里直接更新也无妨，Store 内部可能判断）
      // 简单合并：以 API 返回的 tags 为准
      const newArticle = { ...currentArticle, tags: query.data.tags };

      updateArticle(newArticle);
    }
  }, [query.data, article, updateArticle]);

  return query;
};
