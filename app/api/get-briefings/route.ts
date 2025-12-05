import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../lib/api-utils';
import { Article } from '../../../types'; // Adjust path as needed

export const dynamic = 'force-dynamic'; // Ensure this runs dynamically

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const slot = searchParams.get('slot');
    const articleIdsParam = searchParams.get('articleIds');

    // 1. Query by IDs
    if (articleIdsParam) {
        const supabase = getSupabaseClient();
        // Handle array format if passed as multiple params, but standard URLSearchParams handles duplicates differently.
        // Here we assume comma-separated or multiple keys. Next.js searchParams.getAll('articleIds') handles multiple keys.
        // But the original code might expect 'id1,id2' or repeated params.
        // Let's support both: getAll and comma split.
        let ids: string[] = searchParams.getAll('articleIds');
        if (ids.length === 1 && ids[0].includes(',')) {
            ids = ids[0].split(',');
        }

        // If still empty, check if it was passed as 'articleIds[]'
        if (ids.length === 0) {
            let idsBrackets = searchParams.getAll('articleIds[]');
            if (idsBrackets.length > 0) ids = idsBrackets;
        }

        if (ids.length > 0) {
            const { data: articles, error } = await supabase
                .from('articles')
                .select('*')
                .in('id', ids);

            if (error) {
                console.error('Error fetching from Supabase by IDs:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            const articlesById = (articles || []).reduce((acc, article) => {
                acc[article.id] = article;
                return acc;
            }, {} as Record<string, Article>);

            return NextResponse.json(articlesById);
        }
    }

    // 2. Query by Date
    if (!date) {
        return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    let query = supabase.from('articles').select('*');

    let startDate: Date;
    let endDate: Date;

    // Use UTC construction to match the logic in original file (which used string construction +08:00)
    // But since we are in Node environment, Date parsing with timezone offset works if the string is correct.
    // Original: new Date(`${date}T00:00:00.000+08:00`)
    // We can replicate this logic or use the robust Date.UTC method we used elsewhere.
    // Let's stick to the original logic for consistency unless it was broken (which we fixed elsewhere).
    // Actually, we fixed it in `app/lib/data.ts` using Date.UTC. Let's use that robust approach here too.

    const [year, month, day] = date.split('-').map(Number);

    // Shanghai is UTC+8.
    // 00:00:00 Shanghai = 16:00:00 UTC (previous day)
    let startHourUtc = 0 - 8;
    let endHourUtc = 23 - 8;
    let startMinute = 0; let endMinute = 59;
    let startSecond = 0; let endSecond = 59;

    if (slot === 'morning') {
        // 00:00 - 11:59 Shanghai
        startHourUtc = 0 - 8;
        endHourUtc = 11 - 8;
    } else if (slot === 'afternoon') {
        // 12:00 - 18:59 Shanghai
        startHourUtc = 12 - 8;
        endHourUtc = 18 - 8;
    } else if (slot === 'evening') {
        // 19:00 - 23:59 Shanghai
        startHourUtc = 19 - 8;
        endHourUtc = 23 - 8;
    }

    startDate = new Date(Date.UTC(year, month - 1, day, startHourUtc, startMinute, startSecond, 0));
    endDate = new Date(Date.UTC(year, month - 1, day, endHourUtc, endMinute, endSecond, 999));

    query = query.gte('n8n_processing_date', startDate.toISOString());
    query = query.lte('n8n_processing_date', endDate.toISOString());

    const { data: articles, error } = await query;

    if (error) {
        console.error('Error fetching from Supabase by date:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!articles || articles.length === 0) {
        return NextResponse.json({});
    }

    const uniqueById = new Map<string | number, Article>();
    articles.forEach((a: Article) => { uniqueById.set(a.id, a); });
    const deduped = Array.from(uniqueById.values());

    const groupedArticles: { [key: string]: Article[] } = {
        '重要新闻': [], '必知要闻': [], '常规更新': [],
    };

    deduped.forEach(article => {
        const importance = article.verdict?.importance || '常规更新';
        if (groupedArticles[importance]) {
            groupedArticles[importance].push(article);
        } else {
            groupedArticles['常规更新'].push(article);
        }
    });

    for (const importance in groupedArticles) {
        groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
    }

    return NextResponse.json(groupedArticles);
}
