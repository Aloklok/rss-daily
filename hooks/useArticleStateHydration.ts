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

    // Access current store state to avoid overwriting fresh client state with stale ISR data
    const currentStoreArticles = useArticleStore.getState().articlesById;

    // 1. Immediate Handover & Smart Merge
    const merged = initialArticles.map((a) => {
      // Check if we already have this article in the store
      const stored = currentStoreArticles[a.id];

      // PROTECTION: If the article exists in Store, we prioritize Store state (Optimistic UI)
      // over 'initialArticleStates' which might be from a stale ISR/RSC re-fetch.
      // We rely on the subsequent 'fetchBatch' (Live API) to handle true synchronization.
      if (stored) {
        // We might want to update non-state fields (like title fixes),
        // but strictly preserve tags to avoid "Unstar -> Star" reverting flash.
        // For now, simply keeping the 'stored' version is safest during a re-hydration.
        // However, 'initialArticles' might have newer metadata (e.g. AI summary).
        // Let's merge metadata but KEEP stored tags.
        return { ...a, tags: stored.tags };
      }

      // Logic A: Server explicitly provides state (e.g. from sequential SSR fetch)
      // Only apply this if we didn't match the 'stored' guard above.
      if (initialArticleStates && initialArticleStates[a.id]) {
        return { ...a, tags: initialArticleStates[a.id] };
      }

      return a;
    });

    // Batch update store
    addArticles(merged);

    // 2. Background Sync & Self-Healing
    // Optimization: Skip sync for articles that already have trusted user state (Aggregated or Hydrated)
    const BATCH_SIZE = 50;
    const MAX_CONCURRENT = 3;

    // We only need to sync if:
    // A. Explicit initialArticleStates were provided (implies potentially stale cached SSR data)
    // B. The article (after merge) STILL lacks user state tags (so we don't know if it's read/starred)
    //    AND it's not explicitly 'unread' (FreshRSS returns empty for unread... this is tricky.
    //    Actually, if we have Aggregated Data, we get explicit tags.
    //    If we have NO user tags, it MIGHT be unread, OR it might be we just didn't fetch state.
    //    Ideally, if we trust 'include_state', then "no tags" equals "unread".
    //    But here 'initialArticles' might be from ISR (which never has tags).
    //    So we can only skip sync if we positively see user tags.

    const idsToSync = merged
      .filter((a) => {
        const hasUserTags = a.tags?.some((t) => t.startsWith('user/-/state'));
        // If we have explicit user tags, we trust them (Optimized Skip)
        if (hasUserTags) return false;

        // If we have explicit initialArticleStates, we MUST verify (Stale Check)
        // (Because even if it matches "empty", it might be stale empty vs new read)
        if (initialArticleStates && initialArticleStates[a.id]) return true;

        // Default: Sync everything else to be safe
        return true;
      })
      .map((a) => a.id);

    // If everything is optimized away, stop here
    if (idsToSync.length === 0) return;

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

    // Fire and forget (Background)
    processBatches();
  }, [initialArticles, initialArticleStates, addArticles, date]);
}
// End of file
