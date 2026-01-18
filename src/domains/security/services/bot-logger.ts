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

  let botName = 'Unknown-Bot';

  // Replicating Proxy Logic for consistency but with better specificity
  if (/Googlebot/i.test(userAgent)) botName = 'Googlebot';
  else if (/Baiduspider/i.test(userAgent)) botName = 'Baiduspider';
  else if (/Bingbot/i.test(userAgent)) botName = 'Bingbot';
  else if (/YandexBot/i.test(userAgent)) botName = 'YandexBot';
  else if (/DuckDuckGo/i.test(userAgent)) botName = 'DuckDuckGo';
  else if (/Sogou/i.test(userAgent)) botName = 'Sogou';
  else if (/Baiduspider|Slurp|Yisou|Exabot|facebot|facebookexternalhit/i.test(userAgent)) {
    botName = 'Search-Engine';
  } else if (
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
  } else {
    // Other generic bots or just logging 404s for unknown agents if needed
    // For now, we only care if it's one of the above categories hitting a 404
    if (status !== 404) return;
    botName = 'Unknown-Agent';
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
