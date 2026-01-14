import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { Article, CleanArticleContent } from '@/shared/types';
import { getCleanArticleContent } from '@/domains/reading/services/readingClient';

export const useArticleContent = (
  article: Article,
  initialData?: CleanArticleContent | null,
  options?: { enabled?: boolean },
) => {
  const query = useQuery({
    queryKey: ['article', 'content', article.id],
    queryFn: () => getCleanArticleContent(article, { includeState: true }),
    enabled: options?.enabled !== false && !!article.id,
    initialData: initialData || undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // 同步聚合的状态到 Store
  // 关键:只依赖 query.data?.tags,不依赖 updateArticle 函数引用
  useEffect(() => {
    if (query.data?.tags) {
      const currentArticle = useArticleStore.getState().articlesById[article.id] || article;
      const newArticle = { ...currentArticle, tags: query.data.tags };
      useArticleStore.getState().updateArticle(newArticle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.tags, article.id]);

  return query;
};
