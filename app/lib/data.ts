import { getSupabaseClient } from './api-utils';
import { Article } from '../../types';

export async function fetchAvailableDates(): Promise<string[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('articles')
        .select('n8n_processing_date')
        .order('n8n_processing_date', { ascending: false });

    if (error) {
        console.error('Supabase error in fetchAvailableDates:', error);
        return [];
    }

    const dateSet = new Set<string>();
    if (data) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
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

    return Array.from(dateSet);
}

export function getTodayInShanghai(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai',
    });
    return formatter.format(new Date());
}

export async function fetchBriefingData(date: string): Promise<{ [key: string]: Article[] }> {
    const supabase = getSupabaseClient();

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('Invalid date format in fetchBriefingData:', date);
        return {};
    }

    const [year, month, day] = date.split('-').map(Number);

    // Shanghai is UTC+8.
    // We construct the UTC time corresponding to Shanghai's 00:00:00 and 23:59:59.999
    // 00:00:00 Shanghai = 16:00:00 UTC (previous day) -> handled by -8 hours
    const startDate = new Date(Date.UTC(year, month - 1, day, 0 - 8, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23 - 8, 59, 59, 999));

    const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .gte('n8n_processing_date', startDate.toISOString())
        .lte('n8n_processing_date', endDate.toISOString());

    if (error) {
        console.error('Error fetching from Supabase by date:', error);
        return {};
    }

    if (!articles || articles.length === 0) {
        return {};
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
            // Fallback for unknown importance
            groupedArticles['常规更新'].push(article);
        }
    });

    for (const importance in groupedArticles) {
        groupedArticles[importance].sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
    }

    return groupedArticles;
}

import { toFullId } from '../../utils/idHelpers';

export async function fetchArticleById(id: string): Promise<Article | null> {
    const supabase = getSupabaseClient();

    // Try to convert to full ID if it looks like a short ID
    // This handles cases where the URL provides a short ID (e.g. from routing)
    const fullId = toFullId(id);

    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', fullId)
        .single();

    if (error) {
        // If searching by full ID fails, try searching by the raw ID just in case
        // (though toFullId handles already-full IDs gracefully)
        if (fullId !== id) {
            const { data: retryData, error: retryError } = await supabase
                .from('articles')
                .select('*')
                .eq('id', id)
                .single();

            if (!retryError) return retryData;
        }

        console.error('Error fetching article by ID:', error);
        return null;
    }
    return data;
}
