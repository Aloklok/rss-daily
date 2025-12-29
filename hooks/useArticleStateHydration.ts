import { useEffect, useMemo } from 'react';
import { useArticleStore } from '@/store/articleStore';
import { getArticleStates } from '@/services/clientApi';
import { Article } from '@/types';

/**
 * Shared hook to handle article state hydration (star/read/tags).
 * Implements the "Tripartite Synchronization" strategy:
 * 1. Immediate store update with SSR data (initialArticles + initialArticleStates).
 * 2. Background sync from client to correct stale ISR/CDN caches.
 * 3. Self-Healing: If client finds mismatch with server states, trigger revalidation.
 */
export function useArticleStateHydration(
  initialArticles: Article[],
  initialArticleStates?: { [key: string]: string[] },
  date?: string, // Optional date for revalidation trigger
) {
  const addArticles = useArticleStore((state) => state.addArticles);

  // 【关键修复】使用 useMemo 在渲染前就合并数据,避免 Hydration Mismatch
  const merged = useMemo(() => {
    if (initialArticles.length === 0) return [];

    // Access current store state to avoid overwriting fresh client state with stale ISR data
    const currentStoreArticles = useArticleStore.getState().articlesById;

    return initialArticles.map((a) => {
      // Check if we already have this article in the store
      const stored = currentStoreArticles[a.id];

      // PROTECTION: If the article exists in Store, we prioritize Store state (Optimistic UI)
      // over 'initialArticleStates' which might be from a stale ISR/RSC re-fetch.
      if (stored) {
        // Merge metadata but KEEP stored tags
        return { ...a, tags: stored.tags };
      }

      // Logic A: Server explicitly provides state (e.g. from sequential SSR fetch)
      if (initialArticleStates && initialArticleStates[a.id]) {
        return { ...a, tags: initialArticleStates[a.id] };
      }

      return a;
    });
  }, [initialArticles, initialArticleStates]);

  // 【立即同步】在渲染前就更新 Store,确保客户端首次渲染和 SSR 一致
  useEffect(() => {
    if (merged.length > 0) {
      addArticles(merged);
    }
  }, [merged, addArticles]);

  // 2. Background Sync & Self-Healing
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

    let hasMismatch = false;

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

          if (serverTags && !tagsMatch(freshTags, serverTags)) {
            hasMismatch = true;
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
        console.warn('[Sync] Background state sync failed for batch', err);
      }
    };

    const processBatches = async () => {
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

      // 3. Self-Healing: If mismatch detected, clear server cache
      if (hasMismatch && date) {
        console.info(`[Sync] Stale cache detected for ${date}. Triggering revalidation...`);
        fetch('/api/system/revalidate-date', {
          method: 'POST',
          body: JSON.stringify({ date }),
        }).catch((err) => console.warn('[Sync] Auto-revalidation failed', err));
      }
    };

    processBatches();
  }, [merged, initialArticleStates, addArticles, date]);
}
