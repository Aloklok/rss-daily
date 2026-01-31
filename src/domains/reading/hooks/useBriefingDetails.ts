import { useQuery } from '@tanstack/react-query';
import { Article } from '@/shared/types';
import { getArticlesDetails } from '@/domains/reading/services/readingClient';
import { useArticleStore } from '@/domains/article/store/articleStore';

export const useBriefingDetails = (
  article: Article,
  hasBriefingData: boolean,
  options?: { enabled?: boolean; tableName?: string },
) => {
  const updateArticle = useArticleStore((state) => state.updateArticle);
  const tableName = options?.tableName || 'articles_view';

  return useQuery({
    queryKey: ['article', 'details', article.id, tableName],
    queryFn: async () => {
      const detailsMap = await getArticlesDetails([article.id], tableName);
      const details = detailsMap[article.id];
      if (details) {
        // Optimistically update the store as well so list view updates
        const mergedArticle = {
          ...article,
          ...details,
          tags: article.tags,
        };
        updateArticle(mergedArticle);
        return mergedArticle;
      }
      return article; // Return original if no details found
    },
    // Only fetch if we are in briefing mode and strictly don't have data yet
    enabled: options?.enabled !== false && !hasBriefingData && !!article.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
