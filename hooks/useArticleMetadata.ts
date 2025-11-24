// hooks/useArticleMetadata.ts

import { useMemo } from 'react';
import { Article } from '../types';
import { useArticleStore } from '../store/articleStore';
import { STAR_TAG, READ_TAG } from '../constants';

/**
 * 一个健壮的自定义 Hook，用于从 article 对象中派生出常用的元数据。
 * 无论输入的 article 是否为 null 或 undefined，它始终返回一个包含默认值的有效对象。
 * @param article - 需要计算元数据的文章对象，可以是 null 或 undefined。
 * @returns 返回一个包含 isStarred (boolean), isRead (boolean), 和 userTagLabels (string[]) 的对象。
 */
export const useArticleMetadata = (article: Article | null | undefined) => {
    const availableUserTags = useArticleStore(state => state.availableFilters.tags);

    // 【改】将所有计算逻辑包裹在单个 useMemo 中，以确保原子性和健壮性。
    // 无论 article 是否存在，这个 Hook 都会返回一个结构完整的对象。
    return useMemo(() => {
        // 1. 定义默认返回值，这是防止 a.length 错误的关键
        const defaults = {
            isStarred: false,
            isRead: false,
            userTagLabels: [],
        };

        // 2. 如果没有文章或文章没有标签，立即返回默认值
        if (!article?.tags) {
            return defaults;
        }

        // 3. 如果有文章，则进行计算
        const tags = article.tags;

        const isStarred = tags.includes(STAR_TAG);
        const isRead = tags.includes(READ_TAG);

        let userTagLabels: string[] = [];
        // 确保 availableUserTags 也已加载
        if (availableUserTags && availableUserTags.length > 0) {
            const availableUserTagMap = new Map(availableUserTags.map(t => [t.id, t.label]));
            userTagLabels = tags
                .filter(tagId => availableUserTagMap.has(tagId))
                .map(tagId => availableUserTagMap.get(tagId))
                .filter(Boolean) as string[];
        }

        return {
            isStarred,
            isRead,
            userTagLabels,
        };
    }, [article, availableUserTags]); // 依赖项是 article 对象本身和标签列表
};