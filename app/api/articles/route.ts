import { NextRequest, NextResponse } from 'next/server';
import { fetchArticleContentServer } from '../../lib/data';

export async function POST(request: NextRequest): Promise<NextResponse> {
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
  } catch (error: unknown) {
    console.error('Error in articles API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Internal Server Error', error: errorMessage },
      { status: 500 },
    );
  }
}
