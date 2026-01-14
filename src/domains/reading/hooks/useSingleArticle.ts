import { useQuery } from '@tanstack/react-query';
import { Article } from '@/shared/types';
import { getArticleStates, getArticlesDetails } from '@/domains/reading/services/readingClient';

export const useSingleArticle = (articleId: string | undefined, initialData?: Article) => {
  return useQuery({
    queryKey: ['article', articleId],
    queryFn: async (): Promise<Article | null> => {
      if (!articleId) return null;

      // 1. Fetch state (tags, etc.) from FreshRSS
      // We use getArticleStates which takes an array of IDs
      const statesMap = await getArticleStates([articleId]);
      const tags = statesMap[articleId] || [];

      // 2. Fetch details from Supabase
      // We use getArticlesDetails which takes an array of IDs
      const detailsMap = await getArticlesDetails([articleId]);
      const details = detailsMap[articleId];

      // 3. Construct the article object
      // Even if Supabase has no data (details is undefined), we return a minimal object
      // so the modal can at least try to render or show a "not found" state.
      // However, without a title, it's hard.
      // Let's assume if we have an ID, we can at least show the reader view if we fetch content later.

      return {
        ...details, // Spread Supabase details first
        id: articleId,
        title: details?.title || 'Loading...', // Placeholder
        tags: tags,
      } as Article;
    },
    enabled: !!articleId,
    initialData: initialData,
    // Article content (body, title) is immutable.
    // Metadata (tags, state) is managed via optimistic updates in the store.
    // Therefore, we can cache the fetch result indefinitely to avoid unnecessary network requests.
    staleTime: Infinity,
  });
};
