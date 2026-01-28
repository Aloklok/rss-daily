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

const articleCache = new Map<string | number, CleanArticleContent | null>();

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

export const getRawStarredArticles = (tableName: string = 'articles_view'): Promise<Article[]> => {
  return getArticlesByLabel({ type: 'starred', value: STAR_TAG }, undefined, 50, tableName).then(
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
  options?: { includeState?: boolean; tableName?: string },
): Promise<BriefingReport[]> => {
  const params: Record<string, string> = { date };
  if (slot) params.slot = slot;
  if (options?.includeState) params.include_state = 'true';
  if (options?.tableName) params.table = options.tableName;

  try {
    const timestamp = Date.now().toString();
    const data = await apiClient.request<GroupedArticles>('/api/briefings', {
      params: { ...params, _t: timestamp },
    });
    if (!data || Object.values(data).every((arr) => arr.length === 0)) return [];

    const isEn = typeof window !== 'undefined' && window.location.pathname.includes('/en');
    const monthDay = new Date(date).toLocaleString(isEn ? 'en-US' : 'zh-CN', {
      month: 'long',
      day: 'numeric',
    });
    const reportTitle = isEn ? `${monthDay} Briefing` : `${monthDay} 简报`;
    return [{ id: 1, title: reportTitle, articles: data }];
  } catch {
    return [];
  }
};

export const getArticlesDetails = (
  articleIds: (string | number)[],
  tableName: string = 'articles_view',
): Promise<Record<string, Article>> => {
  if (!articleIds || articleIds.length === 0) {
    return Promise.resolve({});
  }
  const params = new URLSearchParams();
  articleIds.forEach((id) => params.append('articleIds', String(id)));
  params.append('table', tableName);

  const timestamp = Date.now().toString();
  return apiClient.request<Record<string, Article>>(
    `/api/briefings?${params.toString()}&_t=${timestamp}`,
  );
};

export const getCleanArticleContent = async (
  article: Article,
  options?: { includeState?: boolean },
): Promise<CleanArticleContent | null> => {
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
    return null;
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
  tableName: string = 'articles_view',
): Promise<{ articles: Article[]; continuation?: string }> => {
  const params: Record<string, string> = { value: filter.value, n: String(n), table: tableName };
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
  tableName: string = 'articles_view',
): Promise<{ articles: Article[]; isFallback: boolean; errorSnippet?: string }> => {
  const timestamp = Date.now().toString();
  return apiClient.request('/api/articles/search', {
    params: { query, page: String(page), table: tableName, _t: timestamp },
  });
};
