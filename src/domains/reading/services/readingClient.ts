// Reading Domain - Client API Functions
// Extracted from src/services/clientApi.ts

import { apiClient } from '@/shared/infrastructure/api/apiClient';
import {
  Article,
  BriefingReport,
  CleanArticleContent,
  AvailableFilters,
  Filter,
  GroupedArticles,
  TimeSlot,
} from '@/shared/types';
import { STAR_TAG } from '@/domains/interaction/constants';

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

export const getRawStarredArticles = (): Promise<Article[]> => {
  return getArticlesByLabel({ type: 'starred', value: STAR_TAG }, undefined, 50).then(
    (res) => res.articles,
  );
};

export const getAvailableDates = (): Promise<string[]> => {
  return apiClient
    .request<string[]>('/api/meta/available-dates', {
      params: { _t: Date.now().toString() },
    })
    .catch(() => []);
};

export const getBriefingReportsByDate = async (
  date: string,
  slot?: TimeSlot,
  options?: { includeState?: boolean },
): Promise<BriefingReport[]> => {
  const params: Record<string, string> = { date };
  if (slot) params.slot = slot;
  if (options?.includeState) params.include_state = 'true';

  try {
    const timestamp = Date.now().toString();
    const data = await apiClient.request<GroupedArticles>('/api/briefings', {
      params: { ...params, _t: timestamp },
    });
    if (!data || Object.values(data).every((arr) => arr.length === 0)) return [];

    const reportTitle = `${new Date(date).toLocaleString('zh-CN', { month: 'long', day: 'numeric' })} 简报`;
    return [{ id: 1, title: reportTitle, articles: data }];
  } catch {
    return [];
  }
};

export const getArticlesDetails = (
  articleIds: (string | number)[],
): Promise<Record<string, Article>> => {
  if (!articleIds || articleIds.length === 0) {
    return Promise.resolve({});
  }
  const params = new URLSearchParams();
  articleIds.forEach((id) => params.append('articleIds', String(id)));

  const timestamp = Date.now().toString();
  return apiClient.request<Record<string, Article>>(
    `/api/briefings?${params.toString()}&_t=${timestamp}`,
  );
};

export const getCleanArticleContent = async (
  article: Article,
  options?: { includeState?: boolean },
): Promise<CleanArticleContent> => {
  if (articleCache.has(article.id)) {
    return articleCache.get(article.id)!;
  }
  try {
    const content = await apiClient.request<CleanArticleContent>('/api/articles', {
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
      content: `<h3>无法加载文章内容</h3><p>获取文章内容时出错。请尝试直接访问原文链接。</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">点击此处查看原文</a></p>`,
    };
  }
};

export const getArticleStates = (
  articleIds: (string | number)[],
): Promise<{ [key: string]: string[] }> => {
  if (!articleIds || articleIds.length === 0) return Promise.resolve({});
  return apiClient
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

export const getArticlesByLabel = (
  filter: Filter,
  continuation?: string,
  n: number = 20,
): Promise<{ articles: Article[]; continuation?: string }> => {
  const params: Record<string, string> = { value: filter.value, n: String(n) };
  if (continuation) params.c = continuation;

  return apiClient.request<{ articles: Article[]; continuation?: string }>('/api/articles/list', {
    params,
  });
};

export const getAvailableFilters = (): Promise<AvailableFilters> => {
  const timestamp = Date.now().toString();
  return apiClient
    .request<AvailableFilters>('/api/meta/tags', {
      params: { _t: timestamp },
    })
    .catch((error) => {
      console.error('Failed to fetch available filters:', error);
      return { categories: [], tags: [] };
    });
};

export const getDailyStatuses = async (startDate: string, endDate: string) => {
  const timestamp = Date.now().toString();
  return apiClient.request<Record<string, boolean>>('/api/daily-statuses', {
    params: { start_date: startDate, end_date: endDate, _t: timestamp },
  });
};

export const updateDailyStatus = async (date: string, isCompleted: boolean) => {
  return apiClient.request<{ success: boolean; date: string; is_completed: boolean }>(
    '/api/daily-statuses',
    {
      method: 'POST',
      body: { date, is_completed: isCompleted },
    },
  );
};

export const searchArticlesByKeyword = (
  query: string,
  page: number = 1,
): Promise<{ articles: Article[]; isFallback: boolean; errorSnippet?: string }> => {
  const timestamp = Date.now().toString();
  return apiClient.request('/api/articles/search', {
    params: { query, page: String(page), _t: timestamp },
  });
};
