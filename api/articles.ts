import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';
import { FreshRSSItem } from '../types';

async function getArticleContent(req: VercelRequest, res: VercelResponse) {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'Article ID is required.' });
    }

    const freshRss = getFreshRssClient();
    const body = new URLSearchParams({ i: String(id) });
    const data = await freshRss.post<{ items: FreshRSSItem[] }>('/stream/items/contents?output=json', body);

    if (!data.items || data.items.length === 0) {
        return res.status(404).json({ message: 'Article content not found in FreshRSS response.' });
    }

    const item = data.items[0];
    const content = item.summary?.content || item.content?.content || '';
    const source = item.origin?.title || (item.canonical?.[0]?.href ? new URL(item.canonical[0].href).hostname : '');

    return res.status(200).json({
        title: item.title,
        content: content,
        source: source,
    });
}

export default apiHandler(['POST'], getArticleContent);
