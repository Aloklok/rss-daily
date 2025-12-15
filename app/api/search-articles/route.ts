import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, verifyAdmin } from '../../lib/api-utils';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
        return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ message: 'Search query parameter is required.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .rpc('search_articles_by_partial_keyword', {
                search_term: query.trim()
            });

        if (error) {
            console.error('Supabase RPC error:', error);
            return NextResponse.json({
                message: 'Supabase search failed via RPC',
                details: error.message,
            }, { status: 500 });
        }

        return NextResponse.json(data || []);

    } catch (err: unknown) {
        console.error('Unexpected server error', err);
        return NextResponse.json({
            message: 'Unexpected server error',
            details: err instanceof Error ? err.message : String(err),
        }, { status: 500 });
    }
}
