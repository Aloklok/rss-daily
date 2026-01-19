import { createClient } from '@supabase/supabase-js';
import {
  UTILITY_BOTS_PATTERN,
  SEARCH_ENGINE_BOTS_PATTERN,
  SEO_SCRAPER_BOTS_PATTERN,
  AI_ARCHIVE_BOTS_PATTERN,
  extractSearchEngineName,
} from '@/domains/security/constants';

// Dedicated Supabase client for fire-and-forget logging to avoid reusing the main app client context
const supabaseUrl = process.env.SUPABASE_URL!;
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
) {
  if (!userAgent) return;

  // 1. Silent Bypass for Utility Bots
  if (UTILITY_BOTS_PATTERN.test(userAgent)) return;

  let botName = 'Unknown-Bot';
  let isSearchEngine = false;

  // 2. Identify White-listed Search Engines
  if (SEARCH_ENGINE_BOTS_PATTERN.test(userAgent)) {
    botName = extractSearchEngineName(userAgent);
    isSearchEngine = true;
  }
  // 3. Identify Known Bad/AI Bots
  else if (SEO_SCRAPER_BOTS_PATTERN.test(userAgent)) {
    botName = 'SEO-Scraper';
  } else if (AI_ARCHIVE_BOTS_PATTERN.test(userAgent)) {
    botName = 'AI-Bot';
  }

  // 4. Selective Logging Policy (The Data De-noiser)
  // - Record all Security Blocks (403) regardless of agent
  // - Record Search Engine hits (200/404/5xx) for SEO audit
  // - SILENTLY DROP everything else (Unknown 404s, standard user 404s, etc)
  const isSecurityBlock = status === 403;
  const isServerError = status >= 500 && status < 600;
  const isAuditTarget = isSearchEngine || botName === 'SEO-Scraper' || botName === 'AI-Bot';

  if (!isSecurityBlock && !(isAuditTarget && (status === 200 || status === 404 || isServerError))) {
    return;
  }

  // Fallback for security blocks without a specific bot name
  if (isSecurityBlock && botName === 'Unknown-Bot') {
    botName = 'Security-Interception';
  }

  try {
    const country = headers.get('x-vercel-ip-country') || '';

    await supabase.from('bot_hits').insert({
      bot_name: botName, // No longer appending -404, relying on status column
      path: path,
      user_agent: userAgent,
      status: status,
      ip_country: country || null,
      meta: meta || null,
    });
  } catch (err) {
    console.error('[BotLogger] Failed to log hit:', err);
  }
}
