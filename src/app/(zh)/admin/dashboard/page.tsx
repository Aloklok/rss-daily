'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardStats } from '@/shared/types/dashboard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SEARCH_ENGINE_KEYWORDS } from '@/domains/security/constants';

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [_statsError, setStatsError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        // Trigger AI fetch after stats are loaded
        fetchAiSummary();
      } else {
        setStatsError('数据加载失败，请重试');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStatsError('网络错误，请检查连接');
    } finally {
      setLoadingStats(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAiSummary = useCallback(async () => {
    // Cancel previous AI request if exists
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    aiAbortControllerRef.current = new AbortController();

    try {
      setLoadingAI(true);
      setAiError(false);
      const res = await fetch('/api/admin/stats/ai', {
        signal: aiAbortControllerRef.current.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.aiSummary);
        setAiGeneratedAt(
          new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        );
      } else {
        setAiError(true);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch AI summary:', error);
        setAiError(true);
      }
    } finally {
      setLoadingAI(false);
    }
  }, []);

  // Bot 分类逻辑 - useMemo 必须在条件返回之前（React Hooks 规则）
  const { searchEngineBots, otherBots } = useMemo(() => {
    if (!stats?.security?.topBots) {
      return { searchEngineBots: [], otherBots: [] };
    }
    const seKeywordsLower = SEARCH_ENGINE_KEYWORDS.map((k) => k.toLowerCase());
    const searchEngine = stats.security.topBots.filter((b) =>
      seKeywordsLower.some((keyword) => b.name.toLowerCase().includes(keyword)),
    );
    const other = stats.security.topBots.filter(
      (b) => !seKeywordsLower.some((keyword) => b.name.toLowerCase().includes(keyword)),
    );
    return { searchEngineBots: searchEngine, otherBots: other };
  }, [stats?.security?.topBots]);

  useEffect(() => {
    fetch('/api/auth/check')
      .then((res) => res.json())
      .then((data) => {
        if (data.isAdmin) {
          setIsAdmin(true);
          fetchStats();
        } else {
          setIsAdmin(false);
          router.push('/');
        }
      })
      .catch(() => setIsAdmin(false));
  }, [router, fetchStats]);

  if (isAdmin === null || (isAdmin && loadingStats)) {
    return (
      <div className="dark:bg-midnight-bg flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-orange-500"></div>
          <div className="text-sm font-bold tracking-widest text-stone-400 uppercase">
            系统初始化中...
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <></>;

  const maxTrend = Math.max(...stats.content.dailyTrend.map((t) => Number(t.count)), 1);
  const lastUpdatedFormatted = stats.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '刚刚';

  return (
    <div className="-mx-2 min-h-screen w-full max-w-none bg-[#fdfcf8] p-4 pb-20 font-sans text-gray-900 sm:p-2 md:-mx-8 lg:-mx-12">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between border-b border-stone-200 px-4 pb-6 md:px-12">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-stone-900 lg:text-3xl">
            管理员看板
          </h1>
          <p className="mt-1.5 flex items-center gap-3 text-xs font-medium text-stone-400">
            数据最后同步: {lastUpdatedFormatted}
          </p>
        </div>
        <button
          onClick={() => {
            if (!loadingStats) fetchStats();
          }}
          disabled={loadingStats}
          className={`rounded-xl bg-white px-6 py-2.5 text-xs font-bold shadow-sm ring-1 ring-stone-200 transition-all active:scale-95 ${
            loadingStats
              ? 'cursor-not-allowed text-stone-300'
              : 'text-stone-600 hover:bg-stone-50 hover:ring-stone-300'
          }`}
        >
          {loadingStats ? '加载中...' : '刷新看板数据'}
        </button>
      </div>

      <div className="px-4 md:px-12">
        {/* --- ROW 1: CONTENT ENGINE --- */}
        <section className="mb-10">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-5 w-1.5 rounded-full bg-stone-900"></div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">内容生产全景</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-4 lg:col-span-4">
              <div className="flex h-[120px] flex-col justify-between rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-stone-100">
                <p className="text-xs font-black tracking-[0.15em] text-stone-700 uppercase">
                  全站文章库总计
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-stone-900 tabular-nums">
                    {stats.content.totalArticles.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">篇</span>
                </div>
              </div>
              <div className="relative flex h-[120px] flex-col justify-between overflow-hidden rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-stone-100">
                <p className="text-xs font-black tracking-[0.15em] text-stone-700 uppercase">
                  今日新增文章
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-black ${stats.content.todayAdded > 0 ? 'text-green-600' : 'text-stone-900'} tabular-nums`}
                  >
                    +{stats.content.todayAdded}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">篇</span>
                </div>
                {stats.content.todayAdded > 0 && (
                  <div className="absolute top-0 left-0 h-1 w-full bg-green-500/20"></div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="h-full rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-stone-100">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-[11px] font-black tracking-widest text-stone-800 uppercase">
                    30日文章生成数量
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-900"></span>
                    <span className="text-[10px] font-bold text-stone-300">每日入库</span>
                  </div>
                </div>
                <div className="relative flex h-32 w-full items-end justify-between gap-1">
                  {/* Y-axis Ticks */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-full flex-col justify-between">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex w-full items-center gap-2 border-t border-dashed border-stone-100/50 first:border-t-0"
                      >
                        <span className="w-4 text-left font-mono text-[8px] text-stone-300">
                          {Math.round((maxTrend / 3) * (3 - i))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {stats.content.dailyTrend.map((t, i) => (
                    <div
                      key={i}
                      className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className="w-full min-w-[6px] rounded-t bg-stone-900 transition-all duration-300 group-hover:bg-orange-600"
                        style={{ height: `${Math.max((Number(t.count) / maxTrend) * 100, 4)}%` }}
                      >
                        <div className="pointer-events-none absolute -top-10 left-1/2 z-30 -translate-x-1/2 rounded bg-stone-900 px-2 py-1 whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          <p className="text-[10px] font-bold text-white">{t.count} 篇</p>
                          <p className="text-[9px] text-stone-500">{t.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.content.dailyTrend.length === 0 && (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-stone-300">
                      暂无最近30天数据
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between text-[9px] font-bold tracking-widest text-stone-400">
                  <span>{stats.content.dailyTrend[0]?.date || ''}</span>
                  <span>
                    {stats.content.dailyTrend[stats.content.dailyTrend.length - 1]?.date || ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- ROW 2: BOT TRAFFIC HUB --- */}
        <section className="mb-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1.5 rounded-full bg-blue-600"></div>
              <h2 className="text-xl font-black tracking-tight text-stone-900">流量与收录审计</h2>
            </div>
            <span className="rounded-full border border-stone-100 bg-stone-50 px-3 py-1 text-[9px] font-bold text-stone-400">
              统计范围：全量历史数据
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Search Engine Access Stats (200) */}
            <div className="rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-stone-100">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-[11px] font-black tracking-widest text-stone-800 uppercase">
                  爬虫访问统计 (200)
                </h3>
                <span className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600">
                  正常抓取
                </span>
              </div>
              <div className="space-y-4">
                {searchEngineBots.length > 0 ? (
                  searchEngineBots.map((bot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-stone-50 pb-3 last:border-0 last:pb-0"
                    >
                      <p className="text-xs font-bold text-stone-700">{bot.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-green-600 tabular-nums">
                          {bot.allowed_count}
                        </span>
                        <span className="text-[9px] font-medium text-stone-400">次</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[11px] font-bold text-stone-500">
                    暂无搜索引擎抓取记录
                  </div>
                )}
              </div>
            </div>

            {/* Search Engine Exception Logs (4xx/5xx) */}
            <div className="rounded-[32px] bg-white bg-gradient-to-br from-white to-orange-50/20 p-8 shadow-sm ring-1 ring-stone-100">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-[11px] font-black tracking-widest text-orange-800 uppercase">
                  爬虫异常日志 (4xx/5xx)
                </h3>
                <span className="rounded border border-orange-100 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600">
                  死链/崩溃监控
                </span>
              </div>
              <div className="max-h-[280px] space-y-3 overflow-y-auto">
                {searchEngineBots.filter((b) => b.blocked_count > 0).length > 0 ? (
                  searchEngineBots
                    .filter((b) => b.blocked_count > 0)
                    .map((bot, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-orange-100 bg-orange-50/30 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-bold text-orange-700">{bot.name}</p>
                          <span className="text-[9px] font-black text-orange-500 tabular-nums">
                            {bot.blocked_count} 次异常
                          </span>
                        </div>
                        {bot.error_paths && bot.error_paths.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {bot.error_paths.slice(0, 3).map((path, pIdx) => (
                              <code
                                key={pIdx}
                                className="block truncate rounded bg-white/50 px-2 py-1 font-mono text-[9px] text-stone-500"
                              >
                                {path}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-[11px] font-bold text-stone-500">
                    未检测到爬虫异常
                  </div>
                )}
              </div>
              <p className="mt-4 border-t border-orange-100/50 pt-3 text-[9px] font-medium text-orange-400/60 italic">
                ※ 此区域展示搜索引擎爬虫遇到的 404/403/5xx
                错误，可用于检测死链、内容缺失和服务崩溃。
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-5 w-1.5 rounded-full bg-orange-500"></div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">内容洞察与分类</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-stone-100">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-[11px] font-black tracking-widest text-stone-800 uppercase">
                  核心领域排行
                </h3>
                <span className="rounded border border-orange-100 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600">
                  热门分类
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {stats.content.categoryHeatmap.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border-b border-stone-50 px-2 py-2 transition-colors last:border-0 hover:bg-stone-50"
                  >
                    <span
                      className={`text-[10px] font-bold ${idx === 0 ? 'text-orange-600' : 'text-stone-600'}`}
                    >
                      {idx + 1}. {item.category}
                    </span>
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-400 tabular-nums">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-stone-100">
              <div className="mb-6 flex items-center justify-between text-[11px] font-black tracking-widest text-stone-800 uppercase">
                <h3>源头分布审计</h3>
                <span className="rounded border border-orange-100 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600">
                  来源分布
                </span>
              </div>
              <div className="space-y-6">
                {stats.content.sourceDistribution.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="mb-1.5 flex justify-between text-[10px] font-bold text-stone-600">
                      <span className="transition-colors group-hover:text-stone-900">
                        {item.source}
                      </span>
                      <span className="font-mono tabular-nums opacity-40">{item.count}</span>
                    </div>
                    <div className="flex h-1 w-full overflow-hidden rounded-full bg-stone-50">
                      <div
                        className="h-full rounded-full bg-stone-200 transition-all duration-1000"
                        style={{
                          width: `${(item.count / stats.content.totalArticles) * 200}%`,
                          backgroundColor: `oklch(0.7 0.05 ${idx * 20 + 40})`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-5 w-1.5 rounded-full bg-red-600"></div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">全站安全防御</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="flex h-full flex-col justify-center rounded-[32px] border-b-[4px] border-red-500/10 bg-white p-8 text-center shadow-sm ring-1 ring-stone-100">
                <p className="mb-2 text-[9px] font-black tracking-[0.2em] text-red-600 uppercase">
                  今日拦截请求 (403)
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span
                    className={`text-4xl font-black tracking-tighter tabular-nums ${stats.security.todayBlocked > 0 ? 'text-red-700' : 'text-stone-900'}`}
                  >
                    {stats.security.todayBlocked}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">次</span>
                </div>
                <div className="mt-6 border-t border-stone-50 pt-6">
                  <p className="mb-2 text-[9px] font-black tracking-[0.2em] text-stone-500 uppercase">
                    今日异常审计 (4xx/5xx)
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-2xl font-black tracking-tighter text-stone-700 tabular-nums">
                      {stats.security.todayNotFound}
                    </span>
                    <span className="text-[10px] font-bold text-stone-400">次</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="h-full rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-stone-100">
                <div className="mb-6">
                  <h3 className="text-[11px] font-black tracking-widest text-stone-800 uppercase">
                    最近审计详情
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  {/* Column 1: Blocked Paths (High Risk) */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                      <span className="text-[10px] font-bold text-red-600">
                        高危拦截 (403 Blocked)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {stats.security.blockedPaths.length > 0 ? (
                        stats.security.blockedPaths.map((item, idx) => (
                          <div
                            key={idx}
                            className="group flex flex-col border-b border-red-50 py-1 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <code className="max-w-[70%] truncate rounded bg-red-50 px-2 py-0.5 font-mono text-[9px] text-red-600 transition-all group-hover:bg-red-100">
                                {item.path}
                              </code>
                              <span className="text-[10px] font-bold text-red-400 tabular-nums">
                                {item.count}
                              </span>
                            </div>
                            {item.bot_name && (
                              <p className="mt-0.5 px-2 text-[8px] font-bold text-red-300">
                                {item.bot_name}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-[10px] text-stone-300">
                          暂无拦截记录
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Anomaly Paths (404/5xx) */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-400"></div>
                      <span className="text-[10px] font-bold text-stone-600">
                        异常审计 (4xx/5xx)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {stats.security.anomalyPaths.length > 0 ? (
                        stats.security.anomalyPaths.map((item, idx) => (
                          <div
                            key={idx}
                            className="group flex flex-col border-b border-stone-50 py-2 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <code className="max-w-[70%] truncate rounded bg-stone-50 px-2 py-0.5 font-mono text-[9px] text-stone-500 transition-all group-hover:bg-orange-50 group-hover:text-orange-600">
                                {item.path}
                              </code>
                              <span className="text-[10px] font-bold text-stone-400 tabular-nums">
                                {item.count}
                              </span>
                            </div>
                            {item.reason && (
                              <p className="mt-1 px-2 text-[8px] font-medium text-orange-400 opacity-80">
                                原因: {item.reason}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-[10px] text-stone-300">
                          暂无异常记录
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Bots (Non-Search-Engine Interceptions) */}
            <div className="lg:col-span-12">
              <div className="rounded-[32px] bg-white bg-gradient-to-br from-white to-red-50/10 p-8 shadow-sm ring-1 ring-stone-100">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-[11px] font-black tracking-widest text-red-800 uppercase">
                    异常流量与安全审计 (4xx/5xx)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-red-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm shadow-red-500/30">
                      403 拦截
                    </span>
                    <span className="rounded-md bg-violet-400 px-2 py-0.5 text-[9px] font-black text-white shadow-sm shadow-violet-400/30">
                      404 探测
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {otherBots.length > 0 ? (
                    otherBots.slice(0, 8).map((bot, idx) => {
                      const is403Dominant =
                        (bot.status_403_count || 0) >= (bot.status_404_count || 0);
                      const bgColor = is403Dominant
                        ? 'border-red-100 bg-red-50/30'
                        : 'border-violet-100 bg-violet-50/30';
                      const textColor = is403Dominant ? 'text-red-600' : 'text-violet-600';
                      const total = bot.allowed_count + bot.blocked_count;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 rounded-lg border p-3 ${bgColor}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-bold text-stone-600">
                              {bot.name || 'Unknown'}
                            </p>
                            <p className="mt-0.5 text-[8px] font-medium text-stone-400">
                              {bot.status_403_count || 0} 拦截 / {bot.status_404_count || 0} 探测
                            </p>
                          </div>
                          <div
                            className={`text-right font-mono text-sm font-black tabular-nums ${textColor}`}
                          >
                            {total}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-8 text-center text-[11px] font-bold text-stone-500">
                      未监测到恶意爬虫
                    </div>
                  )}
                </div>
                <p className="mt-6 border-t border-red-100/50 pt-3 text-[9px] font-medium text-red-400/60 italic">
                  ※ 此区域展示非搜索引擎的异常流量，包括被拦截的恶意爬虫、AI
                  训练机器人和服务器错误。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Summary Section (Async) - Moved to bottom */}
        <div className="mt-6 mb-20 min-h-[160px] overflow-hidden rounded-[24px] bg-stone-50 p-1 ring-1 ring-stone-200/50">
          <div className="flex h-full items-start gap-4 rounded-[20px] bg-white p-6 shadow-sm">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-lg text-white shadow-lg ${
                aiError ? 'bg-red-500 shadow-red-500/20' : 'bg-orange-600 shadow-orange-500/20'
              } ${loadingAI ? 'animate-pulse' : ''}`}
            >
              AI
            </div>
            <div className="prose prose-stone prose-sm prose-p:my-1 prose-headings:my-2 prose-ul:my-1 w-full max-w-none">
              <div className="not-prose mb-2 flex items-center gap-3">
                <div className="text-[10px] font-black tracking-[0.3em] text-stone-400 uppercase select-none">
                  智能总监运营报告
                </div>
                {aiGeneratedAt && (
                  <span className="text-[9px] font-medium text-stone-300">
                    生成于 {aiGeneratedAt}
                  </span>
                )}
                <div className="h-px flex-1 bg-stone-100"></div>
              </div>
              <div className="min-h-[80px] text-sm leading-relaxed font-bold text-stone-700">
                {aiError ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="mb-3 text-[11px] font-bold text-red-500">AI 分析加载失败</p>
                    <button
                      onClick={() => fetchAiSummary()}
                      disabled={loadingAI}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                    >
                      {loadingAI ? '重试中...' : '点击重试'}
                    </button>
                  </div>
                ) : aiSummary ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSummary}</ReactMarkdown>
                ) : (
                  <div className="animate-pulse space-y-3 py-2">
                    <div className="h-3 w-3/4 rounded bg-stone-100"></div>
                    <div className="h-3 w-1/2 rounded bg-stone-100"></div>
                    <div className="h-3 w-5/6 rounded bg-stone-100"></div>
                    <p className="pt-2 text-[10px] font-bold text-stone-400">
                      AI 智能分析正在生成中...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center opacity-30 select-none">
        <p className="text-[9px] font-black tracking-[0.6em] text-stone-300 uppercase">
          智能简报中心 - 系统架构 v2.9.2
        </p>
      </footer>
    </div>
  );
}
