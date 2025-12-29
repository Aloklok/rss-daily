// hooks/useArticles.ts

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchBriefingArticles,
  fetchFilteredArticles,
  fetchSearchResults,
} from '../services/articleLoader';
import {
  getRawStarredArticles,
  editArticleTag,
  editArticleState,
  markAllAsRead as apiMarkAllAsRead,
} from '../services/clientApi';
import { useArticleStore } from '../store/articleStore';
import { getTodayInShanghai } from '../utils/dateUtils';
import { useToastStore } from '../store/toastStore';

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
      const completeArticles = await fetchBriefingArticles(date, slot);
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

// --- Mutation Hooks ---

// 4. 更新文章状态 (标签、收藏、已读) - 非乐观更新版本
export const useUpdateArticleState = () => {
  const queryClient = useQueryClient();
  const updateArticle = useArticleStore((state) => state.updateArticle);
  const articlesById = useArticleStore((state) => state.articlesById);
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: async ({
      articleId,
      tagsToAdd,
      tagsToRemove,
    }: {
      articleId: string | number;
      tagsToAdd: string[];
      tagsToRemove: string[];
    }) => {
      // 2. 【增加】创建一个数组来收集所有需要执行的 promise
      const apiPromises: Promise<any>[] = [];

      // --- 处理状态标签 (收藏/已读) ---
      const stateTagsToAdd = tagsToAdd.filter((t) => t.startsWith('user/-/state'));
      const stateTagsToRemove = tagsToRemove.filter((t) => t.startsWith('user/-/state'));

      for (const tag of stateTagsToAdd) {
        if (tag.includes('starred')) apiPromises.push(editArticleState(articleId, 'star', true));
        if (tag.includes('read')) apiPromises.push(editArticleState(articleId, 'read', true));
      }
      for (const tag of stateTagsToRemove) {
        if (tag.includes('starred')) apiPromises.push(editArticleState(articleId, 'star', false));
        if (tag.includes('read')) apiPromises.push(editArticleState(articleId, 'read', false));
      }

      // --- 处理用户自定义标签 ---
      const userTagsToAdd = tagsToAdd.filter((t) => !t.startsWith('user/-/state'));
      const userTagsToRemove = tagsToRemove.filter((t) => !t.startsWith('user/-/state'));

      if (userTagsToAdd.length > 0 || userTagsToRemove.length > 0) {
        apiPromises.push(editArticleTag(articleId, userTagsToAdd, userTagsToRemove));
      }

      // 3. 【修改】使用 Promise.all 来并行执行所有 API 请求
      // 只有当所有请求都成功时，才会继续往下执行
      await Promise.all(apiPromises);

      // API 成功后，计算并返回最新的文章对象
      const articleToUpdate = articlesById[articleId];
      if (!articleToUpdate) throw new Error('Article not found in store');

      const finalTagsSet = new Set(articleToUpdate.tags || []);
      tagsToAdd.forEach((tag) => finalTagsSet.add(tag));
      tagsToRemove.forEach((tag) => finalTagsSet.delete(tag));
      return { ...articleToUpdate, tags: Array.from(finalTagsSet) };
    },
    onSuccess: (updatedArticle, variables) => {
      updateArticle(updatedArticle);

      // 【Toast Notification Logic Moved to Hook】
      // Calculate changes for user tags
      const userTagsToAdd = variables.tagsToAdd.filter((t) => !t.startsWith('user/-/state'));
      const userTagsToRemove = variables.tagsToRemove.filter((t) => !t.startsWith('user/-/state'));

      if (userTagsToAdd.length > 0 || userTagsToRemove.length > 0) {
        const extractLabel = (tag: string) => decodeURIComponent(tag.split('/').pop() || tag);
        const added = userTagsToAdd.map(extractLabel).join(', ');
        const removed = userTagsToRemove.map(extractLabel).join(', ');
        let message = '';
        if (added) message += `成功添加标签: ${added} `;
        if (removed) message += `${added ? ' ' : ''} 成功移除标签: ${removed} `;
        showToast(message.trim(), 'success');
      }

      // 【Active Revalidation】
      // A. Target the specific Article Date for granular data/page refresh
      const dateStr = updatedArticle.n8n_processing_date || updatedArticle.published;
      if (dateStr) {
        const date = dateStr.split('T')[0];
        fetch('/api/system/revalidate-date', {
          method: 'POST',
          body: JSON.stringify({ date }),
        }).catch((err) => console.warn(`[Revalidate] Failed for date: ${date}`, err));
      }

      // B. Keep tag-based revalidation for SEO/Aggregator pages
      const touchedTags = new Set([...variables.tagsToAdd, ...variables.tagsToRemove]);
      touchedTags.forEach((tag) => {
        fetch(`/api/system/revalidate?tag=${encodeURIComponent(tag)}`).catch((err) =>
          console.warn(`[Revalidate] Failed to trigger for ${tag}`, err),
        );
      });
    },
    onError: (err) => {
      console.error('Failed to update article state:', err);
      showToast(err instanceof Error ? err.message : '更新文章状态失败', 'error');
    },
    onSettled: () => {
      // 告诉 react-query，所有与“收藏”相关的查询数据都可能已经过时了。
      // 下一次 useStarredArticles Hook 渲染时，它会自动重新获取最新的头部信息。
      queryClient.invalidateQueries({ queryKey: ['starredHeaders'] });
    },
  });
};

// 5. 批量标记已读
export const useMarkAllAsRead = () => {
  // 2. 【增加】获取新的批量更新 action
  const markArticlesAsRead = useArticleStore((state) => state.markArticlesAsRead);
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (variables: { articleIds: (string | number)[]; date?: string }) =>
      apiMarkAllAsRead(variables.articleIds).then((ids) => ({ ids, date: variables.date })),
    onSuccess: (result) => {
      // markedIds 是从 apiMarkAllAsRead 成功返回的 ID 列表
      const markedIds = result.ids;
      if (!markedIds || markedIds.length === 0) return;

      markArticlesAsRead(markedIds);
      showToast(`已将 ${markedIds.length} 篇文章设为已读`, 'success');

      // Targeted Revalidation for the specific date
      if (result.date) {
        fetch('/api/system/revalidate-date', {
          method: 'POST',
          body: JSON.stringify({ date: result.date }),
        }).catch((err) => console.warn(`[Revalidate] Failed for date: ${result.date}`, err));
      }
    },
    onError: (err) => {
      console.error('Failed to mark as read:', err);
      showToast(err instanceof Error ? err.message : '标记已读失败', 'error');
    },
  });
};

// 2. 【增加】在文件末尾添加新的 useSearchResults Hook
// 2. 【增加】搜索 Hook (升级为 Infinite Query)
export const useSearchResults = (query: string | null) => {
  const addArticles = useArticleStore((state) => state.addArticles);

  return useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: async ({ pageParam = 1 }) => {
      if (!query) return { articles: [], continuation: undefined };

      const result = await fetchSearchResults(query, pageParam as number);
      addArticles(result.articles);

      return {
        articles: result.articles.map((a) => a.id),
        continuation: result.continuation,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.continuation,
    enabled: !!query,
  });
};
