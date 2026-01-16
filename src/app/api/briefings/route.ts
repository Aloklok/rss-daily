import { NextRequest, NextResponse } from 'next/server';
import { fetchBriefingData, fetchArticlesByIds } from '@/domains/reading/services';
import { TimeSlot, Article } from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const slot = searchParams.get('slot') as TimeSlot | null;
  const articleIdsParam = searchParams.get('articleIds');
  const includeState = searchParams.get('include_state') === 'true';

  // 1. Logic Regression: Query by IDs using Domain Service
  if (articleIdsParam) {
    let ids = searchParams.getAll('articleIds');
    if (ids.length === 0) {
      ids = searchParams.getAll('articleIds[]');
    }

    if (ids.length > 0) {
      let articles = await fetchArticlesByIds(ids);

      // Handle interaction states if requested
      if (includeState && articles.length > 0) {
        const { attachArticleStates } = await import('@/domains/interaction/adapters/fresh-rss');
        articles = await attachArticleStates(articles);
      }

      const articlesById = articles.reduce(
        (acc, article) => {
          acc[article.id] = article;
          return acc;
        },
        {} as Record<string, Article>,
      );

      return NextResponse.json(articlesById);
    }
  }

  // 2. Logic Regression: Query by Date using Domain Service
  if (!date) {
    return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
  }

  const groupedArticles = await fetchBriefingData(date, slot);

  // 3. Logic Regression: Attach States using Interaction Adapters
  if (includeState) {
    const allArticles: Article[] = Object.values(groupedArticles).flat();
    if (allArticles.length > 0) {
      const { attachArticleStates } = await import('@/domains/interaction/adapters/fresh-rss');
      const enrichedAll = await attachArticleStates(allArticles);
      const enrichedMap = new Map(enrichedAll.map((a) => [a.id, a]));

      // Map back to groups
      for (const key in groupedArticles) {
        groupedArticles[key] = groupedArticles[key].map((a) => enrichedMap.get(a.id) || a);
      }
    }
  }

  return NextResponse.json(groupedArticles);
}
