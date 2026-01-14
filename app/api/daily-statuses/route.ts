import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, verifyAdmin } from '@/lib/server/apiUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  if (!start_date || !end_date) {
    return NextResponse.json(
      { message: 'start_date and end_date parameters are required.' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('daily_briefing_status')
    .select('date, is_completed')
    .gte('date', start_date)
    .lte('date', end_date);

  if (error) {
    console.error('Supabase error in get-daily-statuses:', error);
    return NextResponse.json(
      { message: 'Error fetching daily statuses', error: error.message },
      { status: 500 },
    );
  }

  const statuses = (data || []).reduce(
    (acc, row) => {
      acc[row.date] = row.is_completed;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  return NextResponse.json(statuses, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { date, is_completed } = body;

    if (!date || typeof is_completed !== 'boolean') {
      return NextResponse.json(
        { message: 'date (YYYY-MM-DD) and is_completed (boolean) are required.' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('daily_briefing_status')
      .upsert({ date: date, is_completed: is_completed }, { onConflict: 'date' });

    if (error) {
      console.error('Supabase error in update-daily-status:', error);
      return NextResponse.json(
        { message: 'Error updating daily status', error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, date, is_completed });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Internal Server Error', error: errorMessage },
      { status: 500 },
    );
  }
}
