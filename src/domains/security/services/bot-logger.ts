import { createClient } from '@supabase/supabase-js';

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
) {
  if (!userAgent) return;

  // 1. Silent Bypass for Utility Bots
  const isUtility =
    /SentryUptimeBot|vercel-favicon|vercel-screenshot|Uptime-Kuma|UptimeRobot|StatusCake/i.test(
      userAgent,
    );
  if (isUtility) return;

  let botName = 'Unknown-Bot';
  let isSearchEngine = false;

  // 2. Identify White-listed Search Engines
  if (/Googlebot/i.test(userAgent)) {
    botName = 'Googlebot';
    isSearchEngine = true;
  } else if (/Baiduspider/i.test(userAgent)) {
    botName = 'Baiduspider';
    isSearchEngine = true;
  } else if (/Bingbot/i.test(userAgent)) {
    botName = 'Bingbot';
    isSearchEngine = true;
  } else if (/YandexBot/i.test(userAgent)) {
    botName = 'YandexBot';
    isSearchEngine = true;
  } else if (/DuckDuckGo/i.test(userAgent)) {
    botName = 'DuckDuckGo';
    isSearchEngine = true;
  } else if (/Sogou/i.test(userAgent)) {
    botName = 'Sogou';
    isSearchEngine = true;
  } else if (/Baiduspider|Slurp|Yisou|Exabot|facebot|facebookexternalhit/i.test(userAgent)) {
    botName = 'Search-Engine';
    isSearchEngine = true;
  }

  // 3. Identify Known Bad/AI Bots
  else if (
    /AhrefsBot|SemrushBot|MJ12bot|Dotbot|DataForSeoBot|Barkrowler|ZoominfoBot|BLEXBot|SeekportBot/i.test(
      userAgent,
    )
  ) {
    botName = 'SEO-Scraper';
  } else if (
    /archive\.org_bot|DuckAssistBot|meta-externalfetcher|MistralAI-User|OAI-SearchBot|Perplexity-User|PerplexityBot|ProRataInc|GPTBot|ChatGPT-User|CCBot|anthropic-ai|Claude-Web|Google-Extended/i.test(
      userAgent,
    )
  ) {
    botName = 'AI-Bot';
  }

  // 4. Selective Logging Policy (The Data De-noiser)
  // - Record all Security Blocks (403) regardless of agent
  // - Record Search Engine hits (200/404) for SEO audit
  // - SILENTLY DROP everything else (Unknown 404s, standard user 404s, etc)
  const isSecurityBlock = status === 403;
  const isAuditTarget = isSearchEngine || botName === 'SEO-Scraper' || botName === 'AI-Bot';

  if (!isSecurityBlock && !(isAuditTarget && (status === 200 || status === 404))) {
    return;
  }

  // Fallback for security blocks without a specific bot name
  if (isSecurityBlock && botName === 'Unknown-Bot') {
    botName = 'Security-Interception';
  }

  try {
    await supabase.from('bot_hits').insert({
      bot_name: botName, // No longer appending -404, relying on status column
      path: path,
      user_agent: userAgent,
      status: status,
    });
  } catch (err) {
    console.error('[BotLogger] Failed to log hit:', err);
  }
}
