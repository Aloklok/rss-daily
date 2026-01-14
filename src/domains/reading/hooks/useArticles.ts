// hooks/useArticles.ts

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchBriefingArticles,
  fetchFilteredArticles,
  fetchSearchResults,
} from '@/domains/reading/services/articleLoader';
import { getRawStarredArticles } from '@/domains/reading/services/readingClient';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useToastStore } from '@/shared/store/toastStore';
import { getTodayInShanghai } from '@/domains/reading/utils/date';

// ... (Query Hooks remain unchanged)

export const useBriefingArticles = (
  date: string | null,
  slot: string | null,
  initialData?: (string | number)[],
) => {
  const today = getTodayInShanghai();
  const addArticles = useArticleStore((state) => state.addArticles);
  return useQuery({
    // 【核心修复 #2】
    // 当 slot 为 null 时，我们给它一个明确的字符串 'all'。
    // 这可以确保 react-query 将 ['briefing', date, null] 和 ['briefing', date, 'all'] 视为两个不同的缓存条目。
    queryKey: ['briefing', date, slot || 'all'],
    queryFn: async () => {
      if (!date) return [];
      // queryFn 接收的仍然是原始的 slot (可以是 null)
      // 【核心优化】开启聚合模式：fetchBriefingArticles 内部会一次性把 Supabase 内容和 FreshRSS 状态取回来
      const completeArticles = await fetchBriefingArticles(date, slot, { includeState: true });
      addArticles(completeArticles);
      return completeArticles.map((a) => a.id);
    },
    enabled: !!date,
    // 【核心修复 #3】
    // initialData (SSR 数据) 通常是全天的数据。
    // 如果我们正在请求特定的 slot (例如 'morning')，我们需要忽略 initialData，
    // 强制 react-query 去获取该 slot 的特定数据。
    // 否则，我们会把全天的数据误作为 'morning' 的数据展示。
    initialData: !slot || slot === 'all' ? initialData : undefined,

    // --- 【核心优化】 ---
    // 动态设置 staleTime
    staleTime: (() => {
      // 如果查询的日期是今天，我们使用一个较短的 staleTime (例如 5 分钟)，
      // 因为今天的数据是会变化的。
      if (date === today) {
        return 1000 * 60 * 10; // 10 minutes (User Requirement)
      }
      // 如果查询的是历史日期，我们告诉 react-query 这个数据是“永不过期”的。
      // Infinity 意味着只要缓存存在，就永远不要认为它是 stale 的，
      // 也就永远不会自动去 refetch。
      return Infinity;
    })(),
    placeholderData: (previousData: any) => previousData,
  });
};

export const useFilteredArticles = (
  filterValue: string | null,
  initialData?: any,
  merge: boolean = false,
) => {
  const addArticles = useArticleStore((state) => state.addArticles);

  return useInfiniteQuery({
    queryKey: ['articles', filterValue],
    queryFn: async ({ pageParam }) => {
      if (!filterValue) return { articles: [], continuation: undefined };

      // pageParam is the continuation token
      const result = await fetchFilteredArticles(
        filterValue,
        pageParam as string | undefined,
        20,
        merge,
      );

      // Add articles to the store
      addArticles(result.articles);

      // Return structure expected by infinite query
      return {
        articles: result.articles.map((a) => a.id), // We only need IDs for the UI list
        continuation: result.continuation,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.continuation, // Use the continuation token for the next page
    enabled: !!filterValue,
    initialData: initialData,
  });
};

// Update useStarredArticles signature
export const useStarredArticles = (
  initialData?: { id: string | number; title: string; tags: string[] }[],
) => {
  const setStarredArticleIds = useArticleStore((state) => state.setStarredArticleIds);
  return useQuery({
    queryKey: ['starredHeaders'],
    queryFn: async () => {
      // 【改】直接调用最底层的 API 函数，获取 FreshRSS 的原始数据
      const freshArticles = await getRawStarredArticles();

      // 我们只更新 starredArticleIds 列表
      setStarredArticleIds(freshArticles.map((a) => a.id));

      // 返回头部信息给 useSidebar Hook
      return freshArticles.map((a) => ({
        id: a.id,
        title: a.title,
        link: a.link,
        sourceName: a.sourceName,
        published: a.published,
        tags: a.tags,
        // Fill in missing properties with defaults to satisfy Article interface
        created_at: new Date().toISOString(),
        category: '',
        briefingSection: '',
        keywords: [],
        verdict: { type: '', score: 0 },
        summary: '',
        tldr: '',
        highlights: '',
        critiques: '',
        marketTake: '',
        n8n_processing_date: undefined,
      }));
    },
    // Hydrate with initial data if provided.
    // Note: initialData from SSR might be partial (id, title), so we cast or adapt if needed.
    // Actually, SidebarStarred only strictly needs id and title for the list,
    // but it might access other props safely or default them.
    // Let's assume initialData is sufficient for hydration to avoid "Loading...".
    initialData: initialData as any,
  });
};

// --- Mutation Hooks (Moved to @/domains/interaction/hooks/useArticleMutations) ---

// 2. 【增加】在文件末尾添加新的 useSearchResults Hook
// 2. 【增加】搜索 Hook (升级为 Infinite Query)
export const useSearchResults = (query: string | null) => {
  const addArticles = useArticleStore((state) => state.addArticles);
  const showToast = useToastStore((state) => state.showToast);

  return useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: async ({ pageParam = 1 }) => {
      if (!query) return { articles: [], continuation: undefined };

      const result = await fetchSearchResults(query, pageParam as number);
      addArticles(result.articles);

      // 如果发生了 Fallback，且是第一页，则给管理员提示
      if (result.isFallback && pageParam === 1 && result.errorSnippet) {
        console.error('🔍 [Search Fallback] Gemini Embedding Failed:', result.errorSnippet);

        // 尝试从 errorSnippet 中提取 Status Code 和 Key 信息
        const statusCode = result.errorSnippet.match(/429|403|400|500/)?.[0] || 'Error';
        const keyInfo = result.errorSnippet.match(/Key: [A-Z0-9_]+/)?.[0] || 'Unknown Key';

        const displayStatus = statusCode === '429' ? '429 Too Many Requests' : statusCode;
        showToast(`AI 搜索失败 [${displayStatus}]，已降级为关键词搜索 | ${keyInfo}`, 'error');
      }

      return {
        articles: result.articles.map((a) => a.id),
        continuation: result.continuation,
        // 同时透传这些信息，以便 UI 层可能需要
        isFallback: result.isFallback,
        errorSnippet: result.errorSnippet,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.continuation,
    enabled: !!query,
  });
};
