import { getSupabaseClient, getFreshRssClient } from './api-utils';
import { Article, FreshRSSItem, CleanArticleContent } from '../../types';
import { removeEmptyParagraphs } from '../../utils/contentUtils';
import { toFullId } from '../../utils/idHelpers';

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

    // Wrap Supabase query with timeout to prevent serverless function hangs
    const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timed out after 10s')), 10000)
    );

    const dataPromise = supabase
        .from('articles')
        .select('*')
        .gte('n8n_processing_date', startDate.toISOString())
        .lte('n8n_processing_date', endDate.toISOString());

    let articles, error;
    try {
        const result = await Promise.race([dataPromise, timeoutPromise]);
        // Supabase returns { data, error } structure
        // @ts-ignore
        articles = result.data;
        // @ts-ignore
        error = result.error;
    } catch (e: any) {
        console.error('Fetch Briefing Data Timeout or Error:', e);
        return {}; // Start with empty if timeout, or throw? better to throw to trigger error.tsx
        // Actually, if we return {}, the page renders "No Articles", which is better than Error page?
        // But user said "Loading..." persisted. If we return {}, it renders BriefingClient -> "No Articles".
        // Let's return {} for now, but log it.
        // Wait, if we return {}, BriefingClient renders. This is SAFE.
    }

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

// End of imports clean up



// 【新增】服务端直接获取文章内容 (用于 SSR / No-JS)

// Helper to strip title - duplicated from ArticleDetail.tsx but needed here for SSR clean
function stripLeadingTitle(contentHtml: string, title: string): string {
    if (!contentHtml || !title) return contentHtml;
    try {
        const h1Match = contentHtml.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match && h1Match[1]) {
            const h1Text = h1Match[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
            const titleLower = title.toLowerCase().trim();
            if (h1Text && (h1Text === titleLower || h1Text.includes(titleLower) || titleLower.includes(h1Text))) {
                return contentHtml.replace(h1Match[0], '');
            }
        }
        const textStart = contentHtml.replace(/^\s+/, '');
        if (textStart.toLowerCase().startsWith(title.toLowerCase().trim())) {
            return contentHtml.replace(new RegExp('^\\s*' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '');
        }
    } catch (e) {
        console.error('stripLeadingTitle error', e);
    }
    return contentHtml;
}

export const fetchArticleContentServer = async (id: string | number): Promise<CleanArticleContent | null> => {
    try {
        const freshRss = getFreshRssClient();
        const apiBody = new URLSearchParams({ i: String(id) });
        // Use endpoint to get JSON content
        const data = await freshRss.post<{ items: FreshRSSItem[] }>('/stream/items/contents?output=json', apiBody);

        if (!data.items || data.items.length === 0) {
            return null;
        }

        const item = data.items[0];
        let contentHtml = item.summary?.content || item.content?.content || '';
        const source = item.origin?.title || (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');
        const title = item.title;

        // Apply same cleaning as client-side
        const cleanedHtml = stripLeadingTitle(contentHtml, title || '');
        const finalHtml = removeEmptyParagraphs(cleanedHtml);

        return {
            title: title,
            content: finalHtml,
            source: source,
        };
    } catch (error) {
        console.error('fetchArticleContentServer error:', error);
        return null;
    }
};

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
