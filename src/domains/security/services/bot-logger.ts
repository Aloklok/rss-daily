import { createClient } from '@supabase/supabase-js';
import {
  UTILITY_BOTS_PATTERN,
  SEARCH_ENGINE_BOTS_PATTERN,
  SEO_SCRAPER_BOTS_PATTERN,
  AI_ARCHIVE_BOTS_PATTERN,
  INTERNAL_WARMUP_PATTERN,
  extractSearchEngineName,
  extractSeoScraperName,
  extractAiArchiveName,
} from '@/domains/security/constants';

// Dedicated Supabase client for fire-and-forget logging to avoid reusing the main app client context
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseUrl = process.env.SUPABASE_URL!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function logServerBotHit(
  path: string,
  userAgent: string,
  headers: Headers,
  status: number,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!userAgent) return;

  // 1. Silent Bypass for Utility Bots
  if (UTILITY_BOTS_PATTERN.test(userAgent)) return;

  let botName = '未知爬虫';
  let isSearchEngine = false;

  // 2. Identify White-listed Search Engines
  if (SEARCH_ENGINE_BOTS_PATTERN.test(userAgent)) {
    botName = extractSearchEngineName(userAgent);
    isSearchEngine = true;
  }
  // 3. Identify Known Bad/AI Bots
  else if (SEO_SCRAPER_BOTS_PATTERN.test(userAgent)) {
    botName = extractSeoScraperName(userAgent);
  } else if (AI_ARCHIVE_BOTS_PATTERN.test(userAgent)) {
    botName = extractAiArchiveName(userAgent);
  } else {
    // 4. Intelligence Fallback for Unknown Bots
    // Try to extract the first token as the name (e.g. "Python/3.9" -> "Python", "Go-http-client" -> "Go-http-client")
    const match = userAgent.match(/^([a-zA-Z0-9.\-_]+)/);
    if (match && match[1]) {
      const token = match[1].toLowerCase();
      // 过滤浏览器伪装 UA（真实浏览器不会被记录，因为不满足后续 isAuditTarget 条件）
      if (token === 'mozilla') {
        // 检测是否为恶意路径探测（/admin, /login 等常见后台路径）
        const MALICIOUS_PATH_PATTERN =
          /^\/(admin|login|register|user|administrator|wp-|\.env|\.git)/i;
        if (MALICIOUS_PATH_PATTERN.test(path)) {
          botName = '目录扫描';
        } else {
          botName = '未知浏览器';
        }
      } else if (
        [
          'curl',
          'wget',
          'python',
          'go-http-client',
          'okhttp',
          'python-requests',
          'python-urllib',
        ].includes(token)
      ) {
        // 这些工具类 UA 访问非 API 路径，大概率是扫描器
        botName = '脚本探测';
      } else {
        botName = match[1];
      }
    }
  }

  // 4. Selective Logging Policy (The Data De-noiser)
  // - Record all Security Blocks (403) regardless of agent
  // - Record Search Engine hits (200/404/5xx) for SEO audit
  // - Record System Errors (with explicit reason) regardless of agent
  // - SILENTLY DROP everything else (Unknown 404s, standard user 404s, etc)
  const isSecurityBlock = status === 403;
  const isServerError = status >= 500 && status < 600;
  const isAuditTarget =
    isSearchEngine ||
    botName === 'SEO商业爬虫' ||
    botName === 'AI BOT' ||
    // 依赖正则测试结果，确保精确提取的名称（如 GPTBot, AhrefsBot）也被记录
    SEO_SCRAPER_BOTS_PATTERN.test(userAgent) ||
    AI_ARCHIVE_BOTS_PATTERN.test(userAgent);

  // Check if this is a system error (explicit reason passed via API)
  const hasSystemError = !!(meta?.reason || meta?.error_reason || meta?.error_message);

  if (INTERNAL_WARMUP_PATTERN.test(userAgent)) return;

  if (
    !isSecurityBlock &&
    !hasSystemError &&
    !(isAuditTarget && (status === 200 || status === 404 || isServerError))
  ) {
    return;
  }

  // Fallback for security blocks without a specific bot name
  if (isSecurityBlock && botName === '未知爬虫') {
    botName = '安全拦截';
  }

  try {
    const country = headers.get('x-vercel-ip-country') || '';
    const requestId = headers.get('x-vercel-id');
    // Extract error reason:
    // 1. Explicitly passed 'error_reason' in meta (from logBotError / API)
    // 2. Or fallback to 'reason' / 'error_message' in meta
    const errorReason =
      (meta?.error_reason as string) ||
      (meta?.reason as string) ||
      (meta?.error_message as string) ||
      null;

    const payload = {
      bot_name: botName,
      path: path,
      user_agent: userAgent,
      status: status,
      ip_country: country || null,
      meta: meta || null,
      request_id: requestId || null,
      error_reason: errorReason,
    };

    // Every record must have a unique request_id (Primary Key)
    const finalRequestId = requestId || crypto.randomUUID();

    // Use UPSERT for single-line request tracking
    // The 'request_id' is now the PRIMARY KEY, so we don't need to specify onConflict
    await supabase.from('bot_hits').upsert({
      ...payload,
      request_id: finalRequestId,
    });
  } catch (err) {
    console.error('[BotLogger] Failed to log hit:', err);
  }
}
