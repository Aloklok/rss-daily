import { NextRequest, NextResponse } from 'next/server';
import { fetchArticleContentServer } from '../../lib/data';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ message: 'Article ID is required.' }, { status: 400 });
        }

        const data = await fetchArticleContentServer(id);

        if (!data) {
            return NextResponse.json({ message: 'Article content not found.' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in articles API:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
