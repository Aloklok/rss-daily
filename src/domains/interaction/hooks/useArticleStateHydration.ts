import { useEffect, useMemo, useState } from 'react';
import { useArticleStore } from '@/domains/article/store/articleStore';
import { getArticleStates } from '@/domains/reading/services/readingClient';
import { Article } from '@/shared/types';

// 定义返回类型接口
interface HydrationResult {
  isHydrating: boolean;
}

/**
 * 处理文章状态水合（收藏/已读/标签）的共享 Hook。
 * 实现“三方同步”策略：
 * 1. 使用 SSR 数据立即更新 Store。
 * 2. 客户端背景同步以修正过时的 ISR/CDN 缓存。
 */
export function useArticleStateHydration(
  initialArticles: Article[],
  initialArticleStates?: { [key: string]: string[] },
  date?: string,
): HydrationResult {
  // 1. 显式声明返回类型
  const addArticles = useArticleStore((state) => state.addArticles);
  const [isHydrating, setIsHydrating] = useState(false);

  // 【关键修复】使用 useMemo 在渲染前就合并数据, 避免 Hydration Mismatch
  const merged = useMemo(() => {
    if (initialArticles.length === 0) return [];

    const currentStoreArticles = useArticleStore.getState().articlesById;

    return initialArticles.map((a) => {
      const stored = currentStoreArticles[a.id];

      // 保护：如果 Store 中已有数据，优先使用客户端状态（实现 Optimistic UI）
      if (stored) {
        return { ...a, tags: stored.tags };
      }

      // 逻辑 A：服务器明确提供了状态
      if (initialArticleStates && initialArticleStates[a.id]) {
        return { ...a, tags: initialArticleStates[a.id] };
      }

      return a;
    });
  }, [initialArticles, initialArticleStates]);

  // 【立即同步】确保客户端首次渲染和 SSR 一致
  useEffect(() => {
    if (merged.length > 0) {
      addArticles(merged);
    }
  }, [merged, addArticles]);

  // 2. 背景同步与自愈
  useEffect(() => {
    if (merged.length === 0) return;

    const BATCH_SIZE = 50;
    const MAX_CONCURRENT = 3;

    const idsToSync = merged
      .filter((a) => {
        const hasUserTags = a.tags?.some((t) => t.startsWith('user/-/state'));
        if (hasUserTags) return false;
        if (initialArticleStates && initialArticleStates[a.id]) return true;
        return true;
      })
      .map((a) => a.id);

    if (idsToSync.length === 0) return;

    const tagsMatch = (t1: string[] = [], t2: string[] = []) => {
      if (t1.length !== t2.length) return false;
      const s1 = new Set(t1);
      return t2.every((t) => s1.has(t));
    };

    const fetchBatch = async (ids: (string | number)[]) => {
      try {
        const states = await getArticleStates(ids);
        const updatedItems: Article[] = [];

        ids.forEach((id) => {
          const freshTags = states[id] || [];
          const serverTags = initialArticleStates ? initialArticleStates[id] : undefined;

          // 2. 修复：删除了原来的空 if 块。如果需要日志，可以在这里添加 console.log
          if (serverTags && !tagsMatch(freshTags, serverTags)) {
            console.log(`[Sync] State mismatch detected for ${id}, self-healing...`);
          }

          const original = merged.find((a) => String(a.id) === String(id));
          if (original) {
            updatedItems.push({ ...original, tags: freshTags });
          }
        });

        if (updatedItems.length > 0) {
          addArticles(updatedItems);
        }
      } catch (err) {
        // 3. 修正笔误：删除了 err) {a 中的 a
        console.warn('[Sync] Background state sync failed for batch', err);
      }
    };

    const processBatches = async () => {
      setIsHydrating(true);
      const chunks = [];
      for (let i = 0; i < idsToSync.length; i += BATCH_SIZE) {
        chunks.push(idsToSync.slice(i, i + BATCH_SIZE));
      }

      const executing: Promise<void>[] = [];
      for (const chunk of chunks) {
        const p = fetchBatch(chunk).then(() => {
          executing.splice(executing.indexOf(p), 1);
        });
        executing.push(p);

        if (executing.length >= MAX_CONCURRENT) {
          await Promise.race(executing);
        }
      }
      await Promise.all(executing);
      setIsHydrating(false);
    };

    processBatches();
  }, [merged, initialArticleStates, addArticles, date]);

  return { isHydrating };
}
