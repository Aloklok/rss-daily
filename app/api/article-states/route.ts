import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient } from '../../lib/api-utils';

interface FreshRssItem {
    id: string;
    categories: string[];
    annotations?: { id: string }[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { articleIds } = body;

        if (!Array.isArray(articleIds) || articleIds.length === 0) {
            return NextResponse.json({});
        }

        const freshRss = getFreshRssClient();
        const formData = new URLSearchParams();
        articleIds.forEach((id: string | number) => formData.append('i', String(id)));

        const data = await freshRss.post<{ items: FreshRssItem[] }>('/stream/items/contents?output=json&excludeContent=1', formData);

        const states: { [key: string]: string[] } = {};
        if (data.items) {
            data.items.forEach((item: FreshRssItem) => {
                const annotationTags = (item.annotations || [])
                    .map(anno => anno.id)
                    .filter(Boolean);

                const allTags = [
                    ...(item.categories || []),
                    ...annotationTags
                ];

                states[item.id] = [...new Set(allTags)];
            });
        }

        return NextResponse.json(states);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ message: 'Error fetching article states', error: errorMessage }, { status: 500 });
    }
}
