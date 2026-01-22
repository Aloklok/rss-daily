import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { DashboardStats, BotStat } from '@/shared/types/dashboard';
import { AI_ARCHIVE_NAME_PATTERNS, SEO_SCRAPER_NAME_PATTERNS } from '@/domains/security/constants';

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
    .select('path, status, error_reason, bot_name')
    .gte('status', 400)
    .order('created_at', { ascending: false })
    .limit(1000); // Analyze last 1000 errors for trends

  const blockedPathsMap = new Map<string, { count: number; botName: string }>();
  const anomalyPathsMap = new Map<string, { count: number; reason?: string }>();

  recentErrors?.forEach((hit) => {
    if (hit.status === 403) {
      const current = blockedPathsMap.get(hit.path);
      // Keep the most frequent bot name or the latest one
      blockedPathsMap.set(hit.path, {
        count: (current?.count || 0) + 1,
        botName: (hit.bot_name as string) || current?.botName || 'Unknown',
      });
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

  const toSortedBlockedList = (map: Map<string, { count: number; botName: string }>) =>
    Array.from(map.entries())
      .map(([path, data]) => ({ path, count: data.count, bot_name: data.botName }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  // Re-aggregate topBots to group specific AI/SEO bots back into categories
  // "GPTBot", "ClaudeBot" -> "AI数据采集"
  // "MJ12bot", "AhrefsBot" -> "SEO爬虫"
  // Search engines and others remain as is
  const aggregatedBotsMap = new Map<string, BotStat>();

  // Helper to check if a name is in our specific lists (we can mock this logic or import constants if possible,
  // but to avoid cycles/deps, simple string matching or re-using the logic conceptually is safer here since this is server-side)
  // Actually, simpler approach: if it's NOT a search engine (which we know from constants but here we rely on data),
  // check if it maps to our known categories.
  // Since we don't have isAiArchiveBot here, we can rely on the fact that we WANT to group everything that isn't a search engine
  // into generic buckets IF they were previously generic.
  // Wait, if the DB now stores "GPTBot", we need to know it belongs to "AI数据采集".
  // The simplest way without importing large constants is to define the mapping sets here or just rely on the dashboard to do display logic.
  // But user wants stats to show CATEGORY.

  // Let's import the check functions from constants? No, that might be circular or heavy.
  // Let's manually aggregate based on a simple set of known names if needed, OR:
  // Since we changed the logger to log specific names, we must map them back.

  // Dynamic re-aggregation:
  // Since we can't easily import the constants file logic without potential issues in this specific file context (if it has client deps etc - it usually doesn't),
  // let's try to import the constants.

  (topBotsData as BotStat[])?.forEach((bot) => {
    let groupName = bot.name;
    // We construct a fake UA-like string or just match name against known lists if we had name-lists available.
    // Actually, distinct functions `isAiArchiveBot` take userAgent but we only have name.
    // We need `isAiArchiveLegacyName` or similar.
    // But since we just changed the logger to extract names based on the SAME patterns,
    // we can't easily reverse it without the mapping.

    // Better Approach:
    // Just pass the granular data to frontend, and let frontend group it?
    // No, user said "Right bottom card shows CATEGORY, that is fine."
    // So backend should probably deliver "AI数据采集" for the stats.

    // Let's use the patterns from constants (RegExp) to match the NAME?
    // No, patterns match UA.
    // However, the `extractBotName` in logger uses `name` field from the array.
    // So we can check if the bot.name exists in `AI_ARCHIVE_NAME_PATTERNS`.
    // So we can check if the bot.name exists in `AI_ARCHIVE_NAME_PATTERNS`.

    const isAi = AI_ARCHIVE_NAME_PATTERNS.some((p: any) => p.name === bot.name);
    const isSeo = SEO_SCRAPER_NAME_PATTERNS.some((p: any) => p.name === bot.name);

    if (isAi || bot.name === 'AI数据采集') groupName = 'AI BOT';
    if (isSeo || bot.name === 'SEO爬虫') groupName = 'SEO商业爬虫';

    // Accumulate
    const existing = aggregatedBotsMap.get(groupName);
    if (existing) {
      existing.allowed_count += bot.allowed_count;
      existing.blocked_count += bot.blocked_count;
      // Merge error paths
      if (bot.error_paths) {
        existing.error_paths = [...(existing.error_paths || []), ...bot.error_paths].slice(0, 5);
      }
    } else {
      aggregatedBotsMap.set(groupName, { ...bot, name: groupName });
    }
  });

  const aggregatedTopBots = Array.from(aggregatedBotsMap.values()).sort(
    (a, b) => b.allowed_count + b.blocked_count - (a.allowed_count + a.blocked_count),
  );

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
      topBots: aggregatedTopBots,
      blockedPaths: toSortedBlockedList(blockedPathsMap),
      anomalyPaths: toSortedAnomalyList(anomalyPathsMap),
    },
    lastUpdated: new Date().toISOString(),
  };
}
