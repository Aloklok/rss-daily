import { useQuery } from '@tanstack/react-query';
import { Article } from '../types';
import { getArticlesDetails } from '../services/clientApi';
import { useArticleStore } from '../store/articleStore';

export const useBriefingDetails = (
  article: Article,
  hasBriefingData: boolean,
  options?: { enabled?: boolean },
) => {
  const updateArticle = useArticleStore((state) => state.updateArticle);

  return useQuery({
    queryKey: ['article', 'details', article.id],
    queryFn: async () => {
      const detailsMap = await getArticlesDetails([article.id]);
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
