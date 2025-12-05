import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient } from '../../lib/api-utils';
import { FreshRSSItem } from '../../../types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ message: 'Article ID is required.' }, { status: 400 });
        }

        const freshRss = getFreshRssClient();
        const apiBody = new URLSearchParams({ i: String(id) });
        const data = await freshRss.post<{ items: FreshRSSItem[] }>('/stream/items/contents?output=json', apiBody);

        if (!data.items || data.items.length === 0) {
            return NextResponse.json({ message: 'Article content not found in FreshRSS response.' }, { status: 404 });
        }

        const item = data.items[0];
        const content = item.summary?.content || item.content?.content || '';
        const source = item.origin?.title || (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');

        return NextResponse.json({
            title: item.title,
            content: content,
            source: source,
        });
    } catch (error: any) {
        console.error('Error in articles API:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
