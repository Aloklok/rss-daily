import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getFreshRssClient } from './_utils.js';
import { STAR_TAG, READ_TAG } from './constants.js';


async function updateArticleState(req: VercelRequest, res: VercelResponse) {
    const { articleId, articleIds, action, isAdding, tagsToAdd, tagsToRemove } = req.body;

    if ((!articleId && (!articleIds || !Array.isArray(articleIds))) || (!action && typeof isAdding === 'undefined' && (!tagsToAdd || !Array.isArray(tagsToAdd) || tagsToAdd.length === 0) && (!tagsToRemove || !Array.isArray(tagsToRemove) || tagsToRemove.length === 0))) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }
    if (action && typeof isAdding !== 'undefined' && typeof isAdding !== 'boolean') {
        return res.status(400).json({ message: 'When action is provided, isAdding must be a boolean' });
    }

    const freshRss = getFreshRssClient();
    const shortLivedToken = await freshRss.getActionToken();

    // 1【修改】我们不再手动构建字符串数组，而是直接使用 URLSearchParams 对象。
    // 这是更标准、更安全的方式，它会自动处理编码。
    const params = new URLSearchParams();

    // 2【修改】为每个 ID 调用 .append() 方法
    const ids = articleIds && Array.isArray(articleIds) ? articleIds : [articleId];
    ids.forEach(id => params.append('i', String(id)));
    params.append('T', shortLivedToken);

    if (action && typeof isAdding === 'boolean') {
        const tagMap = {
            star: STAR_TAG,
            read: READ_TAG,
        };
        const tag = tagMap[action as 'star' | 'read'];
        if (tag) {
            // 3【修改】直接 .append() 完整的标签，让 URLSearchParams 处理编码
            params.append(isAdding ? 'a' : 'r', tag);
        }
    }

    // 4【删除】完全移除 formatTagForBody 函数，因为它是不必要的且逻辑有误。

    // 5【修改】直接遍历 tagsToAdd 和 tagsToRemove 数组，并使用 .append()。
    // 现在发送给 FreshRSS 的 a 和 r 参数将是完整且正确编码的标签 ID。
    if (tagsToAdd && Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
        tagsToAdd.forEach((tag: string) => params.append('a', tag));
    }
    if (tagsToRemove && Array.isArray(tagsToRemove) && tagsToRemove.length > 0) {
        tagsToRemove.forEach((tag: string) => params.append('r', tag));
    }

    // 6【删除】不再需要 bodyParts 和 body 变量。

    const responseText = await freshRss.post<string>('/edit-tag', params);

    if (responseText.trim() !== 'OK') {
        throw new Error(`Failed to update state. FreshRSS responded with: ${responseText}`);
    }

    return res.status(200).json({ success: true });
}

export default apiHandler(['POST'], updateArticleState);
