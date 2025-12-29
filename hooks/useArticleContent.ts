import { useQuery } from '@tanstack/react-query';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent } from '../services/clientApi';

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

  return query;
};
