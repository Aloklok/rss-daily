// services/articleLoader.ts

import {
    getBriefingReportsByDate,
    getRawStarredArticles,
    getArticlesByLabel,
    getStarredArticles,
    getArticlesDetails,
    getArticleStates,
    searchArticlesByKeyword
} from './api';
import { Article } from '../types';

// --- 数据融合辅助函数 ---

// 负责为 “FreshRSS文章” 补充 “Supabase详情”
async function mergeWithSupabaseDetails(freshArticles: Article[]): Promise<Article[]> {
    if (!freshArticles || freshArticles.length === 0) return [];

    try {
        const articleIds = freshArticles.map(a => a.id);
        const supaDetailsById = await getArticlesDetails(articleIds);
        return freshArticles.map(freshArticle => {
            const supaDetails = supaDetailsById[freshArticle.id];
            // 合并时，以 FreshRSS 的数据为基础，用 Supabase 的数据覆盖默认值
            return supaDetails ? { ...supaDetails, ...freshArticle } : freshArticle;
        });
    } catch (error) {
        console.warn('Failed to merge Supabase details, returning fresh articles only:', error);
        // 如果融合失败（比如 URL 太长），降级返回原始文章，保证列表能显示
        return freshArticles;
    }
}

// --- 导出的“数据加载器”函数 ---

// 1. 加载简报文章（已融合）
// 简报必须融合，因为需要 verdict.importance 进行分组
export async function fetchBriefingArticles(date: string, slot: string | null): Promise<Article[]> {
    console.log(`[Loader] Fetching briefing for date: ${date}, slot: ${slot}`);
    const fetchedReports = await getBriefingReportsByDate(date, slot as any);
    const supaArticles = fetchedReports.flatMap(report => Object.values(report.articles).flat());
    if (supaArticles.length === 0) return [];

    const articleIds = supaArticles.map(a => a.id);
    const statesById = await getArticleStates(articleIds);

    return supaArticles.map(supaArticle => ({
        ...supaArticle,
        briefingSection: supaArticle.verdict?.importance || '常规更新',
        tags: statesById[supaArticle.id] || [],
    }));
}

// 2. 加载分类/标签文章（【核心修改】不再融合）
export async function fetchFilteredArticles(filterValue: string, continuation?: string, n: number = 20): Promise<{ articles: Article[], continuation?: string }> {
    console.log(`[Loader] Requesting articles for: ${filterValue}, continuation: ${continuation}`); // 🔍 Debug 1

    // 1. 获取 FreshRSS 数据
    const response = await getArticlesByLabel({ value: filterValue } as any, continuation, n);

    // 2. 【重要】直接返回，不要调用 mergeWithSupabaseDetails
    // 既然 UnifiedArticleModal 已经支持按需加载详情，这里就不需要预加载了。
    // 这避免了因 ID 过长导致的请求失败。
    return response;
}

// 3. 加载收藏文章（【核心修改】建议也不再融合，保持一致性）
export async function fetchStarredArticles(): Promise<Article[]> {
    const freshArticles = await getStarredArticles();
    return freshArticles; // 直接返回
}


// 4. 加载收藏文章的“头部信息”（仅 ID 和标题，供侧边栏初始化使用）
export async function fetchStarredArticleHeaders(): Promise<{ id: string | number; title: string }[]> {
    const freshArticles = await getRawStarredArticles();
    return freshArticles.map(article => ({
        id: article.id,
        title: article.title,
    }));
}

// 5. 搜索（保持融合，或者也可以改为不融合）
// 搜索通常返回结果较少，且 Supabase 是搜索源，所以逻辑稍有不同
export async function fetchSearchResults(query: string): Promise<Article[]> {
    // 搜索源是 Supabase，所以这里天然就有 Supabase 数据
    const supaArticles = await searchArticlesByKeyword(query);
    if (supaArticles.length === 0) return [];

    const articleIds = supaArticles.map(a => a.id);
    const statesById = await getArticleStates(articleIds);

    return supaArticles.map(supaArticle => ({
        ...supaArticle,
        tags: statesById[supaArticle.id] || [],
    }));
}

// 6. 预解析简报头图 URL
export async function resolveBriefingImage(date: string): Promise<string> {
    const seedUrl = `https://picsum.photos/seed/${date}/800/300`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout to protect TTFB

        const response = await fetch(seedUrl, {
            method: 'HEAD',
            redirect: 'manual', // Don't follow, just get the redirect header
            signal: controller.signal,
            next: { revalidate: 86400 }
        });
        clearTimeout(timeoutId);

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) return location;
        }

        return seedUrl;
    } catch (error) {
        console.warn('Failed to resolve briefing image (timeout or error), falling back to seed URL:', error);
        return seedUrl;
    }
}