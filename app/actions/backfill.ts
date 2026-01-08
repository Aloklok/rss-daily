'use server';

 
import { getFreshRssClient, getSupabaseClient } from '@/lib/server/apiUtils';
import { generateBriefingAction, generateBulkBriefingAction } from './briefing';
import { Article, FreshRSSItem } from '@/types';
import { toFullId } from '@/utils/idHelpers';
import { fetchSubscriptions } from '@/lib/server/dataFetcher';

// 定义返回给前端的“候选文章”结构
export interface BackfillCandidate {
  id: string;
  title: string;
  sourceName: string;
  published: string; // ISO String
  link: string;
  status: 'pending' | 'duplicate_id' | 'duplicate_link' | 'processed';
  existingId?: string;
}

interface FetchCandidatesResult {
  candidates: BackfillCandidate[];
  nextContinuationToken?: string;
  totalFetched: number;
  debugInfo?: string;
}

// 辅助函数：标准化 URL 用于去重
function normalizeUrl(url: string = ''): string {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '');
}

/**
 * 获取回溯候选列表 (含去重逻辑)
 * @param streamId 订阅源 ID
 * @param count 获取数量
 * @param offsetContinuationToken 分页 Token
 * @param afterTimestamp (ot) 起始时间 (Newer Than / MinDate) - Unix Timestamp (seconds)
 * @param beforeTimestamp (nt) 结束时间 (Older Than / MaxDate) - Unix Timestamp (seconds)
 */
export async function fetchBackfillCandidates(
  streamId: string,
  count: number = 20,
  offsetContinuationToken?: string,
  afterTimestamp?: number,
  beforeTimestamp?: number,
): Promise<{ success: boolean; data?: FetchCandidatesResult; error?: string }> {
  try {
    const freshRss = getFreshRssClient();
    const supabase = getSupabaseClient();

    // 1. 构建 FreshRSS 参数
    const params: Record<string, string> = {
      n: String(count),
      excludeContent: 'true',
      r: 'd', // Descending (Newest first)
    };

    if (offsetContinuationToken) {
      params.c = offsetContinuationToken;
    }

    // 时间范围过滤 (Adjusted based on User Feedback: Dec filter returned Sept items -> ot acts as "Older Than")
    // Typically GReader: ot = Start Time (Newer Than), nt = End Time (Older Than) ??
    // But if user got Old items when setting Start Time to Dec, then Start Time `ot` was treated as "Everything older than Dec".
    // So we swap:
    // afterTimestamp (MinDate) -> should be 'nt' (Newer Than / Start Time)?
    // beforeTimestamp (MaxDate) -> should be 'ot' (Older Than / End Time)?
    // Let's try swapping them based on empirical evidence.
    // 时间范围过滤
    // FIX: The server-side implementation of GReader API appears to use OR logic when both ot (min) and nt (max) are provided,
    // causing incorrect ranges (e.g. Union of <Jan31 and >Jan1 = All Time).
    // STRATEGY: Use ONLY 'nt' (MaxDate/OlderThan) to get items backwards from the End of Month.
    // Then filter the Start Date manually here.

    if (afterTimestamp) {
      params.pub_ot = String(afterTimestamp); // Min Date (Newer Than)
    }

    if (beforeTimestamp) {
      params.pub_nt = String(beforeTimestamp); // Max Date (Older Than)
    }

    const safeStreamId = encodeURIComponent(streamId);
    const response = await freshRss.get<{
      id: string;
      updated: number;
      continuation?: string;
      items: FreshRSSItem[];
    }>(`/stream/contents/${safeStreamId}`, params);

    const rawItems = response.items || [];
    if (rawItems.length === 0) {
      return { success: true, data: { candidates: [], totalFetched: 0 } };
    }

    // 2. 准备候选并在本地进行 Start Date 过滤
    let candidates: BackfillCandidate[] = rawItems.map((item) => ({
      id: item.id,
      title: item.title || 'Untitled',
      sourceName: item.origin?.title || 'Unknown Source',
      published: new Date(item.published * 1000).toISOString(),
      link: item.alternate?.[0]?.href || item.canonical?.[0]?.href || '',
      status: 'pending',
    }));

    // Client-side Filter for Start Date (afterTimestamp)
    let droppedCount = 0;
    const firstDate = candidates[0]?.published || 'N/A';
    const lastDate = candidates[candidates.length - 1]?.published || 'N/A';

    if (afterTimestamp) {
      candidates = candidates.filter((c) => {
        const pubTime = new Date(c.published).getTime() / 1000;
        const keep = pubTime >= afterTimestamp;
        if (!keep) droppedCount++;
        return keep;
      });
    }

    const idsToCheck = candidates.map((c) => toFullId(c.id));
    const rawLinksToCheck = candidates.map((c) => c.link).filter(Boolean);

    // 3. Supabase 批量查询
    const { data: existingTabsById, error: errId } = await supabase
      .from('articles')
      .select('id, title')
      .in('id', idsToCheck);

    if (errId) throw errId;

    const { data: existingTabsByLink, error: errLink } = await supabase
      .from('articles')
      .select('id, link, title')
      .in('link', rawLinksToCheck);

    if (errLink) throw errLink;

    const existingTitlesMap = new Map<string, string>();
    existingTabsById?.forEach((row) => {
      if (row.title) existingTitlesMap.set(row.id, row.title);
    });

    const existingIds = new Set(existingTabsById?.map((row) => row.id));
    const existingLinksMap = new Map<string, string>();
    existingTabsByLink?.forEach((row) => {
      existingLinksMap.set(normalizeUrl(row.link), row.id);
      if (row.title) existingTitlesMap.set(row.id, row.title);
    });

    // 4. 标记状态
    const FINAL_CANDIDATES: BackfillCandidate[] = candidates.map((c) => {
      const fullId = toFullId(c.id);
      const normLink = normalizeUrl(c.link);

      let status: BackfillCandidate['status'] = 'pending';
      let existingId: string | undefined = undefined;

      if (existingIds.has(fullId)) {
        status = 'duplicate_id';
        existingId = fullId;
      } else {
        const linkHitId = existingLinksMap.get(normLink);
        if (linkHitId) {
          status = 'duplicate_link';
          existingId = linkHitId;
        }
      }

      // 如果存在已有记录且有标题，则替换标题
      const finalTitle = (existingId && existingTitlesMap.get(existingId)) || c.title;

      return {
        ...c,
        title: finalTitle,
        status,
        existingId,
      };
    });

    return {
      success: true,
      data: {
        candidates: FINAL_CANDIDATES,
        nextContinuationToken: response.continuation,
        totalFetched: FINAL_CANDIDATES.length,
        debugInfo: `Raw: ${rawItems.length}, First: ${firstDate}, Last: ${lastDate}, Dropped: ${droppedCount}`,
      },
    };
  } catch (error: unknown) {
    console.error('Fetch Backfill Candidates Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}

interface BulkActionResult {
  success: boolean;
  saved: number;
  total: number;
  results?: { id: string; title: string }[];
  error?: string;
}

/**
 * [真·批量重构] 处理一组文章的简报生成
 * 1. 使用真正的批量 API (generateBulkBriefingAction)
 * 2. 移除自动重试逻辑 (User Preference)
 */
export async function generateBatchBriefing(
  candidates: BackfillCandidate[],
  modelId?: string,
): Promise<{
  success: boolean;
  saved: number;
  total: number;
  titles?: string[];
  errors: string[];
}> {
  // 映射为 Action 接受的结构
  const mockArticles = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    link: c.link,
    sourceName: c.sourceName,
    published: c.published,
    n8n_processing_date: c.published,
  }));

  console.log(`[BatchBriefing] Processing ${candidates.length} articles using model: ${modelId}`);
  const result = (await generateBulkBriefingAction(
    mockArticles as unknown as Article[],
    modelId,
  )) as BulkActionResult;

  if (result.success) {
    // Map results (which contains {id, title}) to just titles array as expected by return type
    const titles = result.results?.map((r) => r.title) || [];
    return {
      success: true,
      saved: result.saved ?? 0,
      total: candidates.length,
      titles: titles,
      errors: [],
    };
  }

  // 报错透传，不再重试
  const errorMsg = result.error || 'Batch processing failed';
  return {
    success: false,
    saved: 0,
    total: candidates.length,
    errors: [errorMsg],
  };
}

/**
 * 触发单个回溯生成 (Fallback)
 */
export async function triggerBackfillGeneration(candidate: BackfillCandidate) {
  const mockArticle = {
    id: candidate.id,
    title: candidate.title,
    link: candidate.link,
    sourceName: candidate.sourceName,
    published: candidate.published,
    n8n_processing_date: new Date().toISOString(),
  };

  return await generateBriefingAction(mockArticle as unknown as Article);
}

export async function getSubscriptionList() {
  return await fetchSubscriptions();
}
