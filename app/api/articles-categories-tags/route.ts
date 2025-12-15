import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient } from '../../lib/api-utils';
import { Article, FreshRSSItem } from '../../../types';

export const dynamic = 'force-dynamic';

function mapFreshItemToMinimalArticle(item: FreshRSSItem): Article {
    const annotationTags = (item.annotations || [])
        .map((anno: { id: string }) => anno.id)
        .filter(Boolean);

    const allTags = [
        ...(Array.isArray(item.categories) ? item.categories : []),
        ...annotationTags
    ];

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
        excludeContent: '1'
    };
    if (n) params.n = n;
    if (c) params.c = c;

    try {
        const data = await freshRss.get<{ items: FreshRSSItem[], continuation?: string }>(`/stream/contents/${safeStreamId}`, params);
        const articles = (data.items || []).map(mapFreshItemToMinimalArticle);

        return NextResponse.json({
            articles,
            continuation: data.continuation
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ message: 'Error fetching from FreshRSS', error: errorMessage }, { status: 500 });
    }
}
