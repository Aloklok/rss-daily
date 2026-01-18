import { generateSiliconFlow } from './siliconflow';
import { DashboardStats } from '@/shared/types/dashboard';

export async function getDashboardAiSummary(stats: DashboardStats): Promise<string> {
  // 1. Prepare the prompt with compressed stats
  // Extract Search Engine Bots specifically
  const searchEngineKeywords = [
    'Google',
    'Baidu',
    'Bing',
    'Sogou',
    'Yandex',
    'DuckDuckGo',
    'Yahoo',
    'ByteDance',
    'Spider',
  ];
  const searchBots = stats.security.topBots.filter((b) =>
    searchEngineKeywords.some((keyword) => b.name.toLowerCase().includes(keyword.toLowerCase())),
  );

  const statsSummary = {
    articles: {
      total: stats.content.totalArticles,
      today: stats.content.todayAdded,
      recent: stats.content.dailyTrend.slice(-7), // 1 week trend
      topCategories: stats.content.categoryHeatmap.slice(0, 3),
    },
    searchEngines: searchBots.map((b) => ({
      name: b.name,
      success: b.allowed_count,
      errorOrBlock: b.blocked_count,
    })),
    security: {
      blockedToday: stats.security.todayBlocked,
      topThreats: stats.security.attackPaths.slice(0, 3),
    },
  };

  const prompt = `你是一位首席运营总监。请根据现有数据撰写一份简报。
    
当前数据摘要：${JSON.stringify(statsSummary)}

撰写要求 (必须严格遵守)：
1.  **开篇必须是 [搜索引擎监测]**
    - 仅关注 Search Engine 爬虫 (Google/Baidu 等)。
    - 汇报 "抓取次数" (Hit) 而非 "文章数"。
    - 成功率高则一笔带过 "运转正常"，有错误 (errorOrBlock > 0) 才展开警示。

2.  **内容与安全简述**
    - 简要点评今日更新量与 7 日趋势 (日期用短格式如 01-13)。
    - 若有高危拦截 (blockedToday > 50 或有异常路径)，请提示；否则简略带过。

3.  **风格规范**
    - **不要** 使用 "板块一"、"板块二" 这种机械的文字。
    - 使用 Markdown，**严禁使用标题语法 (#/##)**，用 **加粗** 或 > 引用来区分段落。
    - 文字极度精简，拒绝啰嗦。像给 CEO 发的电报一样：数据->结论。`;

  try {
    // Using a known free model as per constants.ts
    const model = 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B';
    const messages = [{ role: 'user' as const, content: prompt }];

    const summary = await generateSiliconFlow(messages, model);
    return summary || '暂时无法生成 AI 总结。';
  } catch (error) {
    console.error('Failed to generate dashboard AI summary:', error);
    return 'AI 总结生成失败，请检查模型配额。';
  }
}
