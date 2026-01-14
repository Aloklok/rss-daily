import { Article, FreshRSSItem } from '../../types';

export function mapFreshItemToMinimalArticle(item: FreshRSSItem): Article {
  const annotationTags = (item.annotations || [])
    .map((anno: { id: string }) => anno.id)
    .filter(Boolean);

  const allTags = [...(Array.isArray(item.categories) ? item.categories : []), ...annotationTags];

  return {
    id: item.id || '',
    title: item.title || '',
    link: item.alternate?.[0]?.href || '',
    sourceName: item.origin?.title || '',
    created_at: new Date().toISOString(),
    published: new Date(item.published * 1000).toISOString(),
    category: '',
    briefingSection: '',
    keywords: [],
    verdict: { type: '', score: 0 },
    summary: '',
    tldr: '',
    highlights: '',
    critiques: '',
    marketTake: '',
    n8n_processing_date: undefined,
    tags: allTags,
  };
}
