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

  const { count: todayNotFoundCount } = await supabase
    .from('bot_hits')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartUTC.toISOString())
    .eq('status', 404);

  const { data: blockedVsAllowedData } = await supabase.rpc('get_bot_hits_status_distribution');
  const { data: topBotsData } = await supabase.rpc('get_bot_hits_name_distribution');
  const { data: attackPathsData } = await supabase.rpc('get_bot_hits_path_distribution');

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
      todayNotFound: todayNotFoundCount || 0,
      blockedVsAllowed: (blockedVsAllowedData as { type: string; count: number }[]) || [],
      topBots: (topBotsData as BotStat[]) || [],
      attackPaths: (attackPathsData as { path: string; count: number }[]) || [],
    },
    lastUpdated: new Date().toISOString(),
  };
}
