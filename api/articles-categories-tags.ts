// /api/articles-categories-tags.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';
import { Article, FreshRSSItem } from '../types';

function mapFreshItemToMinimalArticle(item: FreshRSSItem): Article {
    const annotationTags = (item.annotations || [])
        .map((anno: { id: string }) => anno.id)
        .filter(Boolean);

    const allTags = [
        ...(Array.isArray(item.categories) ? item.categories : []),
        ...annotationTags
    ];

    return {
        id: item.id || '',
        title: item.title || '',
        link: item.alternate?.[0]?.href || '',
        sourceName: item.origin?.title || '',
        created_at: new Date().toISOString(),
        published: new Date(item.published * 1000).toISOString(),
        category: '', // Supabase field, default value
        briefingSection: '', // Supabase field, default value
        keywords: [], // Supabase field, default value
        verdict: { type: '', score: 0 }, // Supabase field, default value
        summary: '', // Supabase field, default value
        tldr: '', // Supabase field, default value
        highlights: '', // Supabase field, default value
        critiques: '', // Supabase field, default value
        marketTake: '', // Supabase field, default value
        n8n_processing_date: undefined, // Supabase field, default value
        tags: allTags,
    };
}

async function getArticlesByLabel(req: VercelRequest, res: VercelResponse) {
    const { value: streamId, n, c } = req.query;
    if (!streamId || typeof streamId !== 'string') {
        return res.status(400).json({ message: 'Stream ID is required.' });
    }
    const freshRss = getFreshRssClient();
    // 1. 【核心修复】手动处理特殊字符
    // 我们不能用 encodeURIComponent，因为它会破坏路径中的 '/'
    // 我们只需要把 '&' 变成 '%26'，把 '+' 变成 '%2B' (以防万一)
    // 这样 FreshRSS 既能识别路径结构，又能正确解码标签名
    const safeStreamId = streamId.replace(/&/g, '%26');

    // 2. 构建查询参数
    const params: Record<string, string> = {
        output: 'json',
        excludeContent: '1'
    };
    if (n) params.n = String(n);
    if (c) params.c = String(c);

    // 3. 使用处理后的 safeStreamId 和参数
    const data = await freshRss.get<{ items: FreshRSSItem[], continuation?: string }>(`/stream/contents/${safeStreamId}`, params);
    const articles = (data.items || []).map(mapFreshItemToMinimalArticle);

    // 4. 返回文章列表和 continuation token
    return res.status(200).json({
        articles,
        continuation: data.continuation
    });
}

export default apiHandler(['GET'], getArticlesByLabel);