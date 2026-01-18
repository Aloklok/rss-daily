export interface BotStat {
    name: string;
    allowed_count: number;
    blocked_count: number;
    error_paths: string[];
}

export interface DashboardStats {
    content: {
        totalArticles: number;
        todayAdded: number;
        dailyTrend: { date: string; count: number }[];
        sourceDistribution: { source: string; count: number }[];
        categoryHeatmap: { category: string; count: number }[];
        verdictDistribution: { verdict: string; count: number }[];
    };
    security: {
        todayBlocked: number;
        todayNotFound: number;
        blockedVsAllowed: { type: string; count: number }[];
        topBots: BotStat[];
        attackPaths: { path: string; count: number }[];
    };
    aiSummary?: string;
    lastUpdated?: string;
}
