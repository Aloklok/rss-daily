import { Article, BriefingReport, Tag, CleanArticleContent, AvailableFilters, Filter, GroupedArticles } from '../types';
import { STAR_TAG } from '../constants';



// --- Centralized API Service ---
interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

const apiService = {
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = new URL(endpoint, window.location.origin);
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }

        const config: RequestInit = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url.toString(), config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API request failed with status ${response.status}` }));
                throw new Error(errorData.message);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API request to ${endpoint} failed:`, error);
            showToast(error instanceof Error ? error.message : 'An unknown error occurred.', 'error');
            throw error;
        }
    },
};

import { useToastStore } from '../store/toastStore';

// ... (existing imports)

// --- Reusable Toast Notification Utility ---
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    useToastStore.getState().showToast(message, type);
};

// --- Helper for Shanghai Timezone ---
export const getTodayInShanghai = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'
    });
    return formatter.format(new Date());
};

export const getCurrentTimeSlotInShanghai = (): 'morning' | 'afternoon' | 'evening' => {
    const now = new Date();
    const hour = parseInt(new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Asia/Shanghai'
    }).format(now), 10);

    if (hour >= 0 && hour < 12) {
        return 'morning';
    } else if (hour >= 12 && hour < 19) {
        return 'afternoon';
    } else {
        return 'evening';
    }
};

// --- Refactored API Functions ---

// 【增】为 getArticlesByLabel 创建一个语义化的别名
export const getRawStarredArticles = (): Promise<Article[]> => {
    // 复用 getArticlesByLabel，传入固定的 "starred" 标签 ID，获取 50 条
    return getArticlesByLabel({ type: 'starred', value: STAR_TAG }, undefined, 50).then(res => res.articles);
};



export const getAvailableDates = (): Promise<string[]> => {
    return apiService.request<string[]>('/api/get-available-dates', {
        params: { _t: Date.now().toString() }
    }).catch(() => []);
};

export const getBriefingReportsByDate = async (date: string, slot?: 'morning' | 'afternoon' | 'evening'): Promise<BriefingReport[]> => {
    const params: Record<string, string> = { date };
    if (slot) params.slot = slot;

    try {
        const data = await apiService.request<GroupedArticles>('/api/get-briefings', { params });
        if (!data || Object.values(data).every(arr => arr.length === 0)) return [];

        const reportTitle = `${new Date(date).toLocaleString('zh-CN', { month: 'long', day: 'numeric' })}简报`;
        return [{ id: 1, title: reportTitle, articles: data }];
    } catch {
        return [];
    }
};

export const getArticlesDetails = (articleIds: (string | number)[]): Promise<Record<string, Article>> => {
    if (!articleIds || articleIds.length === 0) {
        return Promise.resolve({});
    }
    // 使用 URLSearchParams 来正确处理数组参数
    const params = new URLSearchParams();
    articleIds.forEach(id => params.append('articleIds', String(id)));

    // 调用我们刚刚修改的 get-briefings 端点
    return apiService.request<Record<string, Article>>(`/api/get-briefings?${params.toString()}`);
};

export const markAllAsRead = (articleIds: (string | number)[]): Promise<(string | number)[]> => {
    if (!articleIds || articleIds.length === 0) return Promise.resolve([]);

    return apiService.request<void>('/api/update-state', {
        method: 'POST',
        body: { articleIds, action: 'read', isAdding: true },
    }).then(() => {
        // 【核心修改】成功后，在这里显示 Toast 并返回 articleIds
        showToast(`已将 ${articleIds.length} 篇文章设为已读`, 'success');
        return articleIds;
    });
};
// --- Article Content Cache ---
const articleCache = new Map<string | number, CleanArticleContent>();

export const getCleanArticleContent = async (article: Article): Promise<CleanArticleContent> => {
    if (articleCache.has(article.id)) {
        return articleCache.get(article.id)!;
    }
    try {
        const content = await apiService.request<CleanArticleContent>('/api/articles', {
            method: 'POST',
            body: { id: article.id },
        });
        articleCache.set(article.id, content);
        return content;
    } catch {
        return {
            title: article.title,
            source: article.sourceName,
            content: `<h3>无法加载文章内容</h3><p>获取文章内容时出错。请尝试直接访问原文链接。</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">点击此处查看原文</a></p>`,
        };
    }
};

export const getArticleStates = (articleIds: (string | number)[]): Promise<{ [key: string]: string[] }> => {
    if (!articleIds || articleIds.length === 0) return Promise.resolve({});
    return apiService.request<{ [key: string]: string[] }>('/api/article-states', {
        method: 'POST',
        body: { articleIds },
    }).catch(() => {
        const states: { [key: string]: string[] } = {};
        articleIds.forEach(id => { states[String(id)] = []; });
        return states;
    });
};

export const editArticleState = (articleId: string | number, action: 'star' | 'read', isAdding: boolean): Promise<void> => {
    return apiService.request<void>('/api/update-state', {
        method: 'POST',
        body: { articleId, action, isAdding },
    });
};

export const editArticleTag = async (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]): Promise<void> => {
    // API 调用保持不变
    await apiService.request<void>('/api/update-state', {
        method: 'POST',
        body: {
            articleId,
            tagsToAdd: tagsToAdd,
            tagsToRemove: tagsToRemove,
        },
    });

    // 【核心修改】成功后，在这里直接显示 Toast
    if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
        const extractLabel = (tag: string) => decodeURIComponent(tag.split('/').pop() || tag);
        const added = tagsToAdd.map(extractLabel).join(', ');
        const removed = tagsToRemove.map(extractLabel).join(', ');
        let message = '';
        if (added) message += `成功添加标签: ${added}`;
        if (removed) message += `${added ? ' ' : ''}成功移除标签: ${removed}`;
        showToast(message.trim(), 'success');
    }
};

export const getArticlesByLabel = (filter: Filter, continuation?: string, n: number = 20): Promise<{ articles: Article[], continuation?: string }> => {
    const params: Record<string, string> = { value: filter.value, n: String(n) };
    if (continuation) params.c = continuation;

    return apiService.request<{ articles: Article[], continuation?: string }>('/api/articles-categories-tags', {
        params,
    });
    // ❌ 删除 .catch(() => []); 
    // 这样我们才能在控制台看到真正的红色报错
};

export const getStarredArticles = (): Promise<Article[]> => {
    // Reuse getArticlesByLabel with the specific stream ID for starred articles, fetch 50 items
    return getArticlesByLabel({ type: 'starred', value: STAR_TAG }, undefined, 50).then(res => res.articles);
};

export const getAvailableFilters = (): Promise<AvailableFilters> => {
    return apiService.request<AvailableFilters>('/api/list-categories-tags').catch(() => ({ categories: [], tags: [] }));
};

export const getTags = async (): Promise<Tag[]> => {
    try {
        const filters = await getAvailableFilters();
        return filters.tags;
    } catch (error) {
        console.error('Failed to fetch tags', error);
        return [];
    }
};


// 【增】获取每日简报完成状态
export const getDailyStatuses = (startDate: string, endDate: string): Promise<Record<string, boolean>> => {
    return apiService.request<Record<string, boolean>>('/api/get-daily-statuses', {
        params: { start_date: startDate, end_date: endDate },
    }).catch(() => ({})); // 出错时返回空对象
};

// 【增】更新每日简报完成状态
export const updateDailyStatus = (date: string, isCompleted: boolean): Promise<{ success: boolean }> => {
    return apiService.request<{ success: boolean }>('/api/update-daily-status', {
        method: 'POST',
        body: { date: date, is_completed: isCompleted },
    });
};




// 【增加】搜索文章
export const searchArticlesByKeyword = (query: string): Promise<Article[]> => {
    return apiService.request<Article[]>('/api/search-articles', {
        params: { query },
    }).catch(() => []);
};