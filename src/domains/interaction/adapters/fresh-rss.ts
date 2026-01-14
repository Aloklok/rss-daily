import 'server-only';
import { getFreshRssClient, FreshRSSItem } from '@/infra/fresh-rss';
import { Article } from '@/shared/types';

export async function fetchArticleStatesServer(
  articleIds: (string | number)[],
): Promise<{ [key: string]: string[] }> {
  if (!articleIds || articleIds.length === 0) return {};

  try {
    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    articleIds.forEach((id: string | number) => formData.append('i', String(id)));

    // Fetch from FreshRSS
    // Use the same endpoint logic as the API route
    const data = await freshRss.post<{ items: FreshRSSItem[] }>(
      '/stream/items/contents?output=json&excludeContent=1',
      formData,
    );

    const states: { [key: string]: string[] } = {};
    if (data.items) {
      data.items.forEach((item: FreshRSSItem) => {
        // 1. Extract System States (Read/Starred) from categories
        // We strictly filter for /state/ to avoid including Folders or Feed Categories
        const stateTags = (item.categories || []).filter((c) => c.includes('/state/'));

        // 2. Extract User Labels from 'tags' field (Source of Truth)
        // Normalize to 'user/-/label/TagName' format to match system ID conventions
        // Note: We use the raw tag name assuming compatibility with categories format observed
        const userLabelTags = (item.tags || []).map((t) => `user/-/label/${t}`);

        // 3. Annotations (User States override)
        const annotationTags = (item.annotations || []).map((anno) => anno.id).filter(Boolean);

        // Merge: States + UserLabels + Annotations
        const allTags = [...stateTags, ...userLabelTags, ...annotationTags];
        states[item.id] = [...new Set(allTags)];
      });
    }

    return states;
  } catch (error) {
    console.error('[Interaction] Error fetching article states:', error);
    // Return empty map on error to allow graceful degradation
    return {};
  }
}

export async function attachArticleStates(articles: Article[]): Promise<Article[]> {
  if (!articles || articles.length === 0) return [];

  // 1. Fetch Request
  const ids = articles.map((a) => a.id);
  const statesMap = await fetchArticleStatesServer(ids);

  // 2. Merge Strategies
  return articles.map((article) => {
    const freshTags = statesMap[article.id] || [];
    // Combine existing Supabase tags with FreshRSS tags
    // Use Set to deduplicate
    const combinedTags = Array.from(new Set([...(article.tags || []), ...freshTags]));

    return {
      ...article,
      tags: combinedTags as any[], // Casting to match Article type constraint if needed, or update Article type
    };
  });
}
