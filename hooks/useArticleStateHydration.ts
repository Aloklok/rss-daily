import { useEffect } from 'react';
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

  useEffect(() => {
    if (initialArticles.length === 0) return;

    // 1. Immediate Handover from Server
    // Merge initial states (star/read) into objects if provided
    const merged = initialArticles.map((a) => {
      if (initialArticleStates && initialArticleStates[a.id]) {
        return { ...a, tags: initialArticleStates[a.id] };
      }
      return a;
    });

    // Batch update store
    addArticles(merged);

    // 2. Background Sync & Self-Healing
    const BATCH_SIZE = 50;
    const MAX_CONCURRENT = 3;
    const allIds = initialArticles.map((a) => a.id);
    let hasMismatch = false;

    // Helper to compare tags
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

          // If server explicitly gave us state, and it's DIFFERENT from live state,
          // we have a stale cache situation.
          if (serverTags && !tagsMatch(freshTags, serverTags)) {
            hasMismatch = true;
          }

          const original = initialArticles.find((a) => String(a.id) === String(id));
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
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        chunks.push(allIds.slice(i, i + BATCH_SIZE));
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

    // Fire and forget (Background)
    processBatches();
  }, [initialArticles, initialArticleStates, addArticles, date]);
}
