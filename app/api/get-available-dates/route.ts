import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('articles')
        .select('n8n_processing_date')
        .order('n8n_processing_date', { ascending: false });

    if (error) {
        console.error('Supabase error in get-available-dates:', error);
        return NextResponse.json({ message: 'Error fetching available dates', error: error.message }, { status: 500 });
    }

    // Process the data to get unique dates based on the Asia/Shanghai timezone
    const dateSet = new Set<string>();
    if (data) {
        const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA format is YYYY-MM-DD
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Shanghai',
        });

        data.forEach(item => {
            if (item.n8n_processing_date) {
                const date = new Date(item.n8n_processing_date);
                dateSet.add(formatter.format(date));
            }
        });
    }

    const dates = Array.from(dateSet);
    return NextResponse.json(dates);
}
