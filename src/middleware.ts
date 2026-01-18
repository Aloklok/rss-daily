import { NextResponse, type NextRequest } from 'next/server';

/**
 * Persistent Logging Utility (Non-blocking)
 */
function logBotHit(
  botName: string,
  path: string,
  userAgent: string,
  status: number,
  country: string = '',
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  // Fire-and-forget logging to Supabase
  fetch(`${supabaseUrl}/rest/v1/bot_hits`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      bot_name: botName,
      path: path,
      user_agent: userAgent,
      status: status,
      ip_country: country || null,
    }),
  }).catch((err) => console.error('[LOG-ERROR] Failed to persist bot hit:', err));
}

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  // Extract Geo Info (Vercel specific header, as request.geo is deprecated in Next 15+)
  const country = request.headers.get('x-vercel-ip-country') || '';

  // 0. Redirect: Fix 404s for legacy/external links with long Google Reader IDs
  if (url.pathname.includes('tag:google.com')) {
    const LONG_ID_PREFIX = 'tag:google.com,2005:reader/item/';
    const decodedPath = decodeURIComponent(url.pathname);

    if (decodedPath.includes(LONG_ID_PREFIX)) {
      const parts = decodedPath.split(LONG_ID_PREFIX);
      if (parts.length > 1) {
        const shortId = parts[1];
        if (shortId && !shortId.includes('/')) {
          const newUrl = new URL(url);
          newUrl.pathname = `/article/${shortId}`;
          return NextResponse.redirect(newUrl, { status: 301 });
        }
      }
    }
  }

  const userAgent = request.headers.get('user-agent') || '';
  const path = url.pathname;

  // --- Priority 0: Critical Path Exceptions ---
  // Always allow robots.txt for all agents to comply with standards
  if (path === '/robots.txt' || path === '/sitemap.xml') {
    return NextResponse.next();
  }

  // --- Security Rule 1: Malicious Path Scanning (Cloudflare Style) ---
  const isMaliciousPath =
    path.includes('/wp-') ||
    path.endsWith('.php') ||
    path.includes('.env') ||
    path.includes('/.git');

  if (isMaliciousPath) {
    console.warn(`[SECURITY-BLOCKED] Malicious Path: ${path} | Agent: ${userAgent}`);
    logBotHit('Malicious-Scanner', path, userAgent, 403, country);
    return new Response('Access Denied: Path is not permitted.', { status: 403 });
  }

  // --- Security Rule 2: Whitelist Search Engines (Baidu, Google, Bing, etc) ---
  const isAllowedBot =
    /Baiduspider|Googlebot|Bingbot|Slurp|Sogou|Yisou|YandexBot|DuckDuckGo|Sogou|Exabot|facebot|facebookexternalhit/i.test(
      userAgent,
    );
  if (isAllowedBot) {
    // Extract specific bot name for clearer logging
    let specificBotName = 'Search-Engine';
    if (/Googlebot/i.test(userAgent)) specificBotName = 'Googlebot';
    else if (/Baiduspider/i.test(userAgent)) specificBotName = 'Baiduspider';
    else if (/Bingbot/i.test(userAgent)) specificBotName = 'Bingbot';
    else if (/YandexBot/i.test(userAgent)) specificBotName = 'YandexBot';
    else if (/DuckDuckGo/i.test(userAgent)) specificBotName = 'DuckDuckGo';
    else if (/Sogou/i.test(userAgent)) specificBotName = 'Sogou';

    logBotHit(specificBotName, path, userAgent, 200, country);
    return NextResponse.next();
  }

  // --- Security Rule 3: Suspicious Requests (Empty/Short UA) ---
  // Note: Known bots (Rule 2) already passed, so this catches suspicious scripts
  if (!userAgent || userAgent.length < 10) {
    return new Response('Access Denied: Suspicious request source.', { status: 403 });
  }

  // --- Security Rule 4: SEO Scrapers & Aggressive Bots (Cloudflare Style) ---
  const HIGH_FREQ_SCAMPERS =
    /AhrefsBot|SemrushBot|MJ12bot|Dotbot|DataForSeoBot|Barkrowler|ZoominfoBot|BLEXBot|SeekportBot/i;
  if (HIGH_FREQ_SCAMPERS.test(userAgent)) {
    console.warn(`[BOT-BLOCKED] Scraper: ${userAgent} | Path: ${path}`);
    logBotHit('SEO-Scraper', path, userAgent, 403, country);
    return new Response('Access Denied: Automated scraping is not permitted.', { status: 403 });
  }

  // --- Security Rule 5: Specific AI & Archive Bots ---
  const AI_AND_ARCHIVE_BOTS =
    /archive\.org_bot|DuckAssistBot|meta-externalfetcher|MistralAI-User|OAI-SearchBot|Perplexity-User|PerplexityBot|ProRataInc|GPTBot|ChatGPT-User|CCBot|anthropic-ai|Claude-Web|Google-Extended/i;

  if (AI_AND_ARCHIVE_BOTS.test(userAgent)) {
    console.warn(`[BOT-BLOCKED] AI/Archive: ${userAgent} | Path: ${path}`);
    logBotHit('AI-Bot', path, userAgent, 403, country);
    return new Response('Access Denied: AI training/archiving is restricted.', { status: 403 });
  }

  // --- Logic 1: Admin Authentication (Token & Cookie) ---
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) return NextResponse.next();

  const urlToken = url.searchParams.get('token');

  // URL Token Authentication (Login)
  if (urlToken === accessToken) {
    url.searchParams.delete('token');
    const redirectUrl = url.toString();
    const isSecure = url.protocol === 'https:';

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('site_token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90,
    });
    return response;
  }

  // Handle Logout
  if (url.searchParams.get('logout') === 'true') {
    return new Response(null, {
      status: 307,
      headers: {
        Location: url.origin,
        'Set-Cookie': `site_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
      },
    });
  }

  // Pass through with custom header for reliable 404 logging
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-current-path', path);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api/|_vercel/|sitemap.xml|robots.txt|.+\\..+).*)'],
};

export default middleware;
