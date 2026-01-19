/**
 * Security Domain Constants
 * 统一管理爬虫白名单、拦截清单和分类规则
 */

// ============================================================
// 1. 工具类机器人 (静默放行，不记录日志)
// ============================================================
export const UTILITY_BOTS_PATTERN =
  /SentryUptimeBot|vercel-favicon|vercel-screenshot|Uptime-Kuma|UptimeRobot|StatusCake/i;

// ============================================================
// 2. 搜索引擎白名单 (放行并记录 SEO 审计)
// ============================================================

/** 合规搜索引擎正则 - 用于 proxy 层放行判断 */
export const SEARCH_ENGINE_BOTS_PATTERN =
  /Baiduspider|Googlebot|Bingbot|Slurp|Yisou|YandexBot|DuckDuckGo|Sogou|Exabot|facebot|facebookexternalhit|Applebot|Bytespider|TikTokSpider|LinkedInBot|Twitterbot|Pinterestbot|Discordbot|Telegrambot|WhatsApp|NaverBot|360Spider|PetalBot/i;

/** 搜索引擎名称提取映射 - 用于日志记录时提取具体名称 */
export const SEARCH_ENGINE_NAME_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /Googlebot/i, name: 'Googlebot' },
  { pattern: /Baiduspider/i, name: 'Baiduspider' },
  { pattern: /Bingbot/i, name: 'Bingbot' },
  { pattern: /YandexBot/i, name: 'YandexBot' },
  { pattern: /DuckDuckGo/i, name: 'DuckDuckGo' },
  { pattern: /Sogou/i, name: 'Sogou' },
  { pattern: /Applebot/i, name: 'Applebot' },
  { pattern: /Bytespider|TikTokSpider/i, name: 'Bytespider' },
  { pattern: /LinkedInBot/i, name: 'LinkedInBot' },
  { pattern: /Twitterbot/i, name: 'Twitterbot' },
  { pattern: /Pinterestbot/i, name: 'Pinterestbot' },
  { pattern: /Discordbot/i, name: 'Discordbot' },
  { pattern: /Telegrambot/i, name: 'Telegrambot' },
  { pattern: /WhatsApp/i, name: 'WhatsApp' },
  { pattern: /NaverBot/i, name: 'NaverBot' },
  { pattern: /360Spider/i, name: '360Spider' },
  { pattern: /PetalBot/i, name: 'PetalBot' },
  { pattern: /Slurp/i, name: 'Yahoo-Slurp' },
  { pattern: /Yisou/i, name: 'Yisou' },
  { pattern: /Exabot/i, name: 'Exabot' },
  { pattern: /facebot|facebookexternalhit/i, name: 'Facebook' },
];

/** Dashboard 搜索引擎分类关键词 - 用于前端 Bot 数据分类展示 */
export const SEARCH_ENGINE_KEYWORDS = [
  'Google',
  'Baidu',
  'Bing',
  'Sogou',
  'Yandex',
  'DuckDuckGo',
  'Yahoo',
  'Slurp',
  'Spider',
  'Exabot',
  'Facebook',
  'Apple',
  'Bytespider',
  'TikTok',
  'LinkedIn',
  'Twitter',
  'Pinterest',
  'Discord',
  'Telegram',
  'WhatsApp',
  'Naver',
  '360',
  'Petal',
  'Yisou',
  'Search-Engine', // fallback 分类名
];

// ============================================================
// 3. SEO 爬虫拦截清单 (403 + 记录)
// ============================================================
export const SEO_SCRAPER_BOTS_PATTERN =
  /AhrefsBot|SemrushBot|MJ12bot|Dotbot|DataForSeoBot|Barkrowler|ZoominfoBot|BLEXBot|SeekportBot|Scrapy/i;

// ============================================================
// 4. AI/Archive 机器人拦截清单 (403 + 记录)
// ============================================================
export const AI_ARCHIVE_BOTS_PATTERN =
  /archive\.org_bot|DuckAssistBot|meta-externalfetcher|MistralAI-User|OAI-SearchBot|Perplexity-User|PerplexityBot|ProRataInc|GPTBot|ChatGPT-User|CCBot|anthropic-ai|Claude-Web|Google-Extended|Amazonbot|cohere-ai|Deepseek|ByteDance-Gemini/i;

// ============================================================
// 5. 辅助函数
// ============================================================

/**
 * 从 User-Agent 中提取搜索引擎名称
 * @returns 匹配的搜索引擎名称，未匹配返回 'Search-Engine'
 */
export function extractSearchEngineName(userAgent: string): string {
  for (const { pattern, name } of SEARCH_ENGINE_NAME_PATTERNS) {
    if (pattern.test(userAgent)) {
      return name;
    }
  }
  return 'Search-Engine';
}

/**
 * 判断是否为搜索引擎爬虫
 */
export function isSearchEngine(userAgent: string): boolean {
  return SEARCH_ENGINE_BOTS_PATTERN.test(userAgent);
}

/**
 * 判断是否为工具类机器人
 */
export function isUtilityBot(userAgent: string): boolean {
  return UTILITY_BOTS_PATTERN.test(userAgent);
}

/**
 * 判断是否为 SEO 爬虫（需拦截）
 */
export function isSeoScraper(userAgent: string): boolean {
  return SEO_SCRAPER_BOTS_PATTERN.test(userAgent);
}

/**
 * 判断是否为 AI/Archive 机器人（需拦截）
 */
export function isAiArchiveBot(userAgent: string): boolean {
  return AI_ARCHIVE_BOTS_PATTERN.test(userAgent);
}
