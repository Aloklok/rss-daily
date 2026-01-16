import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = getSupabaseClient();

  // Use the RPC to get all unique dates directly from DB (avoids 1000 row select limit)
  const { data, error } = await supabase.rpc('get_unique_dates');

  if (error) {
    console.error('Supabase error in get-available-dates:', error);
    return NextResponse.json(
      { message: 'Error fetching available dates', error: error.message },
      { status: 500 },
    );
  }

  // RPC returns { date_str: string }[]
  const dates = data?.map((d: { date_str: string }) => d.date_str) || [];

  return NextResponse.json(dates);
}
