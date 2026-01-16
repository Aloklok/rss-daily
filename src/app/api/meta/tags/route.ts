import { NextResponse } from 'next/server';
import { fetchTagsServer } from '@/domains/reading/services';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const { categories, tags } = await fetchTagsServer();

    return NextResponse.json({
      categories,
      tags,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching categories and tags', error: errorMessage },
      { status: 500 },
    );
  }
}
