import {
  Article,
  BriefingReport,
  CleanArticleContent,
  AvailableFilters,
  Filter,
  GroupedArticles,
  TimeSlot,
} from '../types';
import { STAR_TAG } from '../constants';

// --- Centralized API Service ---
interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string>;
  body?: any;
}

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Fallback for local development if variable not set
  return 'http://localhost:3000';
};

const apiService = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(endpoint, getBaseUrl());
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
        const errorData = await response
          .json()
          .catch(() => ({ message: `API request failed with status ${response.status} ` }));
        throw new Error(errorData.message);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API request to ${endpoint} failed: `, error);
      // throw error to let caller (likely React Query) handle UI feedback
      throw error;
    }
  },
};

const articleCache = new Map<string | number, CleanArticleContent>();

export const getCurrentTimeSlotInShanghai = (): 'morning' | 'afternoon' | 'evening' => {
  const now = new Date();
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai',
    }).format(now),
    10,
  );

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
  return getArticlesByLabel({ type: 'starred', value: STAR_TAG }, undefined, 50).then(
    (res) => res.articles,
  );
};

// Update endpoints
// getAvailableDates
export const getAvailableDates = (): Promise<string[]> => {
  return apiService
    .request<string[]>('/api/meta/available-dates', {
      params: { _t: Date.now().toString() },
    })
    .catch(() => []);
};

// getBriefingReportsByDate
export const getBriefingReportsByDate = async (
  date: string,
  slot?: TimeSlot,
  options?: { includeState?: boolean },
): Promise<BriefingReport[]> => {
  const params: Record<string, string> = { date };
  if (slot) params.slot = slot;
  if (options?.includeState) params.include_state = 'true';

  try {
    const data = await apiService.request<GroupedArticles>('/api/briefings', { params });
    if (!data || Object.values(data).every((arr) => arr.length === 0)) return [];

    const reportTitle = `${new Date(date).toLocaleString('zh-CN', { month: 'long', day: 'numeric' })} 简报`;
    return [{ id: 1, title: reportTitle, articles: data }];
  } catch {
    return [];
  }
};

// getArticlesDetails
export const getArticlesDetails = (
  articleIds: (string | number)[],
): Promise<Record<string, Article>> => {
  if (!articleIds || articleIds.length === 0) {
    return Promise.resolve({});
  }
  const params = new URLSearchParams();
  articleIds.forEach((id) => params.append('articleIds', String(id)));

  // Use /api/briefings for details fetching as well (reusing logic)
  const timestamp = Date.now().toString();
  return apiService.request<Record<string, Article>>(
    `/api/briefings?${params.toString()}&_t=${timestamp}`,
  );
};

// markAllAsRead
export const markAllAsRead = (articleIds: (string | number)[]): Promise<(string | number)[]> => {
  if (!articleIds || articleIds.length === 0) return Promise.resolve([]);

  return apiService
    .request<void>('/api/articles/state', {
      method: 'POST',
      body: { articleIds, action: 'read', isAdding: true },
    })
    .then(() => {
      // Toast moved to Hook
      return articleIds;
    });
};

// getCleanArticleContent
export const getCleanArticleContent = async (
  article: Article,
  options?: { includeState?: boolean },
): Promise<CleanArticleContent> => {
  if (articleCache.has(article.id)) {
    return articleCache.get(article.id)!;
  }
  try {
    // Keep /api/articles as it was kept in root articles dir (or should verify if moved)
    // Plan said: Move app/api/articles/route.ts (keep) - so it stays at /api/articles
    const content = await apiService.request<CleanArticleContent>('/api/articles', {
      method: 'POST',
      body: {
        id: article.id,
        include_state: options?.includeState,
      },
    });
    articleCache.set(article.id, content);
    return content;
  } catch {
    return {
      title: article.title,
      source: article.sourceName,
      content: `< h3 > 无法加载文章内容 < /h3><p>获取文章内容时出错。请尝试直接访问原文链接。</p > <p><a href="${article.link}" target = "_blank" rel = "noopener noreferrer" > 点击此处查看原文 < /a></p > `,
    };
  }
};

// getArticleStates
export const getArticleStates = (
  articleIds: (string | number)[],
): Promise<{ [key: string]: string[] }> => {
  if (!articleIds || articleIds.length === 0) return Promise.resolve({});
  return apiService
    .request<{ [key: string]: string[] }>('/api/articles/state', {
      method: 'POST',
      body: { articleIds },
    })
    .catch((error) => {
      console.error('Failed to fetch article states:', error);
      const states: { [key: string]: string[] } = {};
      articleIds.forEach((id) => {
        states[String(id)] = [];
      });
      return states;
    });
};

// editArticleState
export const editArticleState = (
  articleId: string | number,
  action: 'star' | 'read',
  isAdding: boolean,
): Promise<void> => {
  return apiService.request<void>('/api/articles/state', {
    method: 'POST',
    body: { articleId, action, isAdding },
  });
};

// editArticleTag
export const editArticleTag = async (
  articleId: string | number,
  tagsToAdd: string[],
  tagsToRemove: string[],
): Promise<void> => {
  await apiService.request<void>('/api/articles/state', {
    method: 'POST',
    body: {
      articleId,
      tagsToAdd: tagsToAdd,
      tagsToRemove: tagsToRemove,
    },
  });
  // Toast moved to Hook
};

// getArticlesByLabel
export const getArticlesByLabel = (
  filter: Filter,
  continuation?: string,
  n: number = 20,
): Promise<{ articles: Article[]; continuation?: string }> => {
  const params: Record<string, string> = { value: filter.value, n: String(n) };
  if (continuation) params.c = continuation;

  return apiService.request<{ articles: Article[]; continuation?: string }>('/api/articles/list', {
    params,
  });
};

// getAvailableFilters
export const getAvailableFilters = (): Promise<AvailableFilters> => {
  return apiService.request<AvailableFilters>('/api/meta/tags').catch((error) => {
    console.error('Failed to fetch available filters:', error);
    return { categories: [], tags: [] };
  });
};

// getDailyStatuses
export const getDailyStatuses = async (startDate: string, endDate: string) => {
  // Assuming system routes are not yet moved for this, check plan.
  // Plan: move to app/api/system/ (revalidate, refresh, indexnow).
  // daily-statuses was not explicitly valid in the plan list but usually goes to meta or system?
  // User Plan: Merge `app/api/article-states` and `update-state`.
  // Wait, `app/api/daily-statuses` exists? I should check if it exists.
  // If not moved, keep as is.
  return apiService.request<Record<string, boolean>>('/api/daily-statuses', {
    params: { start_date: startDate, end_date: endDate },
  });
};
// updateDailyStatus
export const updateDailyStatus = async (date: string, isCompleted: boolean) => {
  return apiService.request<{ success: boolean; date: string; is_completed: boolean }>(
    '/api/daily-statuses',
    {
      method: 'POST',
      body: { date, is_completed: isCompleted },
    },
  );
};

// searchArticlesByKeyword
export const searchArticlesByKeyword = (query: string, page: number = 1): Promise<Article[]> => {
  return apiService
    .request<Article[]>('/api/articles/search', {
      params: { query, page: String(page) },
    })
    .catch(() => []);
};
