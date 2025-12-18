import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, verifyAdmin } from '@/lib/server/apiUtils';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  if (!verifyAdmin(cookieStore)) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  if (!query) {
    return NextResponse.json({ message: 'Search query parameter is required.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error } = await supabase
      .rpc('search_articles_by_partial_keyword', {
        search_term: query.trim(),
      })
      .range(from, to);

    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json(
        {
          message: 'Supabase search failed via RPC',
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    console.error('Unexpected server error', err);
    return NextResponse.json(
      {
        message: 'Unexpected server error',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
