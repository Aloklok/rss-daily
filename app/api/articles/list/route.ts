import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient } from '@/lib/server/apiUtils';
import { FreshRSSItem } from '@/types';
import { mapFreshItemToMinimalArticle } from '@/lib/server/mappers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const streamId = searchParams.get('value'); // Note: frontend sends 'value' as param name? Original code used req.query.value
  const n = searchParams.get('n');
  const c = searchParams.get('c');

  if (!streamId) {
    return NextResponse.json({ message: 'Stream ID is required.' }, { status: 400 });
  }

  const freshRss = getFreshRssClient();
  const safeStreamId = streamId.replace(/&/g, '%26');

  const params: Record<string, string> = {
    output: 'json',
    excludeContent: '1',
  };
  if (n) params.n = n;
  if (c) params.c = c;

  try {
    const data = await freshRss.get<{ items: FreshRSSItem[]; continuation?: string }>(
      `/stream/contents/${safeStreamId}`,
      params,
    );
    const articles = (data.items || []).map(mapFreshItemToMinimalArticle);

    return NextResponse.json({
      articles,
      continuation: data.continuation,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching from FreshRSS', error: errorMessage },
      { status: 500 },
    );
  }
}
