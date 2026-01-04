// services/articleLoader.ts

import {
  getBriefingReportsByDate,
  getRawStarredArticles,
  getArticlesByLabel,
  getArticlesDetails,
  getArticleStates,
  searchArticlesByKeyword,
} from './clientApi';
import { Article } from '../types';

// --- 数据融合辅助函数 ---

// 负责为 “FreshRSS文章” 补充 “Supabase详情”
async function mergeWithSupabaseDetails(freshArticles: Article[]): Promise<Article[]> {
  if (!freshArticles || freshArticles.length === 0) return [];

  try {
    const articleIds = freshArticles.map((a) => a.id);
    const supaDetailsById = await getArticlesDetails(articleIds);
    return freshArticles.map((freshArticle) => {
      const supaDetails = supaDetailsById[freshArticle.id];
      // 合并时，以 FreshRSS 的数据为基础，用 Supabase 的详情（AI字段）覆盖它
      // 之前的错误顺序导致空字符串覆盖了有价值的内容
      return supaDetails ? { ...freshArticle, ...supaDetails } : freshArticle;
    });
  } catch (error) {
    console.warn('Failed to merge Supabase details, returning fresh articles only:', error);
    // 如果融合失败（比如 URL 太长），降级返回原始文章，保证列表能显示
    return freshArticles;
  }
}

// --- 导出的“数据加载器”函数 ---

// 1. 加载简报文章（已融合）
// 简报必须融合，因为需要 verdict.importance 进行分组
export async function fetchBriefingArticles(
  date: string,
  slot: string | null,
  options?: { includeState?: boolean },
): Promise<Article[]> {
  console.log(
    `[Loader] Fetching briefing for date: ${date}, slot: ${slot}, includeState: ${options?.includeState}`,
  );
  const fetchedReports = await getBriefingReportsByDate(date, slot as any, options);
  const supaArticles = fetchedReports.flatMap((report) => Object.values(report.articles).flat());
  if (supaArticles.length === 0) return [];

  // Optimization: If aggregated, skip separate client-side fetch (Waterfall elimination)
  if (options?.includeState) {
    return supaArticles.map((supaArticle) => ({
      ...supaArticle,
      briefingSection: supaArticle.verdict?.importance || '常规更新',
      // Tags are already merged by the server aggregation
      tags: supaArticle.tags || [],
    }));
  }

  // Legacy/Fallback behavior: Client-side Waterfall
  const articleIds = supaArticles.map((a) => a.id);
  const statesById = await getArticleStates(articleIds);

  return supaArticles.map((supaArticle) => ({
    ...supaArticle,
    briefingSection: supaArticle.verdict?.importance || '常规更新',
    tags: statesById[supaArticle.id] || [],
  }));
}

// 2. 加载分类/标签文章（【核心修改】不再融合）
// 2. 加载分类/标签文章
export async function fetchFilteredArticles(
  filterValue: string,
  continuation?: string,
  n: number = 20,
  merge: boolean = false, // Optimization: Default to false to skip client-side waterfall. List UI doesn't show AI data.
): Promise<{ articles: Article[]; continuation?: string }> {
  console.log(
    `[Loader] Requesting articles for: ${filterValue}, continuation: ${continuation}, merge: ${merge}`,
  );

  // 1. 获取 FreshRSS 数据
  const response = await getArticlesByLabel({ value: filterValue } as any, continuation, n);

  // 2. 根据 merge 参数决定是否融合 Supabase 详情
  // 对于无限滚动列表，UI不显示AI字段，所以跳过这一步可以消除“闪烁”并显著加速
  if (merge) {
    console.log('[Loader] Merging with Supabase details for Tag Page SSR...');
    const mergedArticles = await mergeWithSupabaseDetails(response.articles);
    return { ...response, articles: mergedArticles };
  }

  // 默认情况：直接返回，不预加载详情（客户端点击弹窗时再加载）
  return response;
}

// 3. 加载收藏文章（【核心修改】建议也不再融合，保持一致性）
export async function fetchStarredArticles(): Promise<Article[]> {
  const freshArticles = await getRawStarredArticles();
  return freshArticles; // 直接返回
}

// 4. 加载收藏文章的“头部信息”（仅 ID 和标题，供侧边栏初始化使用）
export async function fetchStarredArticleHeaders(): Promise<
  { id: string | number; title: string }[]
> {
  const freshArticles = await getRawStarredArticles();
  return freshArticles.map((article) => ({
    id: article.id,
    title: article.title,
  }));
}

// 5. 搜索（支持无限加载）
export async function fetchSearchResults(
  query: string,
  page: number = 1,
): Promise<{
  articles: Article[];
  continuation?: number;
  isFallback?: boolean;
  errorSnippet?: string;
}> {
  const result = await searchArticlesByKeyword(query, page);
  const supaArticles = result.articles;
  if (supaArticles.length === 0) return { ...result, articles: [] };

  const articleIds = supaArticles.map((a) => a.id);
  const statesById = await getArticleStates(articleIds);

  const mergedArticles = supaArticles.map((supaArticle) => ({
    ...supaArticle,
    tags: statesById[supaArticle.id] || [],
  }));

  // 如果返回的数量等于分页大小 (20)
  const hasNextPage = supaArticles.length === 20;

  return {
    ...result,
    articles: mergedArticles,
    continuation: hasNextPage ? page + 1 : undefined,
  };
}
