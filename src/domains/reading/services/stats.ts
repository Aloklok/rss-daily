import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { DashboardStats, BotStat } from '@/shared/types/dashboard';

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseClient();

  // 1. Get Content Stats (Articles)
  const { count: totalArticlesCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  // Calculate Shanghai timezone's "today 00:00:00" in ISO format
  // Shanghai is UTC+8
  const now = new Date();
  const shanghaiOffset = 8 * 60; // minutes
  const localOffset = now.getTimezoneOffset(); // minutes (negative for east of UTC)
  const shanghaiNow = new Date(now.getTime() + (shanghaiOffset + localOffset) * 60 * 1000);
  const shanghaiToday = new Date(shanghaiNow);
  shanghaiToday.setHours(0, 0, 0, 0);
  // Convert back to UTC for database query
  const todayStartUTC = new Date(
    shanghaiToday.getTime() - (shanghaiOffset + localOffset) * 60 * 1000,
  );

  const { count: todayAddedCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .gte('n8n_processing_date', todayStartUTC.toISOString());

  const { data: dailyTrendData } = await supabase.rpc('get_articles_daily_trend');
  const { data: sourceDistData } = await supabase.rpc('get_articles_source_distribution');
  const { data: catHeatmapData } = await supabase.rpc('get_articles_category_heatmap');
  const { data: verdictDistData } = await supabase.rpc('get_articles_verdict_distribution');

  // 2. Get Security Stats (Bot Hits)
  const { count: todayBlockedCount } = await supabase
    .from('bot_hits')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartUTC.toISOString())
    .eq('status', 403);

  const { count: todayAnomalyCount } = await supabase
    .from('bot_hits')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartUTC.toISOString())
    .gte('status', 400)
    .neq('status', 403);

  const { data: blockedVsAllowedData } = await supabase.rpc('get_bot_hits_status_distribution');
  const { data: topBotsData } = await supabase.rpc('get_bot_hits_name_distribution');

  // 3. Manual Aggregation for Paths (Split Blocked vs Anomaly) from recent history
  // RPC 'get_bot_hits_path_distribution' mixes them, so we fetch raw recent errors to separate them.
  const { data: recentErrors } = await supabase
    .from('bot_hits')
    .select('path, status, error_reason')
    .gte('status', 400)
    .order('created_at', { ascending: false })
    .limit(1000); // Analyze last 1000 errors for trends

  const blockedPathsMap = new Map<string, number>();
  const anomalyPathsMap = new Map<string, { count: number; reason?: string }>();

  recentErrors?.forEach((hit) => {
    if (hit.status === 403) {
      blockedPathsMap.set(hit.path, (blockedPathsMap.get(hit.path) || 0) + 1);
    } else {
      const current = anomalyPathsMap.get(hit.path);
      anomalyPathsMap.set(hit.path, {
        count: (current?.count || 0) + 1,
        reason: (hit.error_reason as string) || current?.reason,
      });
    }
  });

  const toSortedAnomalyList = (map: Map<string, { count: number; reason?: string }>) =>
    Array.from(map.entries())
      .map(([path, data]) => ({ path, count: data.count, reason: data.reason }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  const toSortedList = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  return {
    content: {
      totalArticles: totalArticlesCount || 0,
      todayAdded: todayAddedCount || 0,
      // Map RPC result properties to match the interface
      dailyTrend:
        (dailyTrendData as any[])?.map((d) => ({
          date: d.trend_date,
          count: Number(d.entry_count),
        })) || [],
      sourceDistribution: (sourceDistData as { source: string; count: number }[]) || [],
      categoryHeatmap:
        (catHeatmapData as any[])?.map((c) => ({
          category: c.category_name,
          count: Number(c.entry_count),
        })) || [],
      verdictDistribution: (verdictDistData as { verdict: string; count: number }[]) || [],
    },
    security: {
      todayBlocked: todayBlockedCount || 0,
      todayNotFound: todayAnomalyCount || 0,
      blockedVsAllowed: (blockedVsAllowedData as { type: string; count: number }[]) || [],
      topBots: (topBotsData as BotStat[]) || [],
      blockedPaths: toSortedList(blockedPathsMap),
      anomalyPaths: toSortedAnomalyList(anomalyPathsMap),
    },
    lastUpdated: new Date().toISOString(),
  };
}
