import { NextResponse, type NextRequest } from 'next/server';
import {
  UTILITY_BOTS_PATTERN,
  SEARCH_ENGINE_BOTS_PATTERN,
  SEO_SCRAPER_BOTS_PATTERN,
  AI_ARCHIVE_BOTS_PATTERN,
  INTERNAL_WARMUP_PATTERN,
  extractSearchEngineName,
} from '@/domains/security/constants';

/**
 * Persistent Logging Utility (Non-blocking)
 */
// Enhanced Logger with Meta Support
function logBotHit(
  botName: string,
  path: string,
  userAgent: string,
  status: number,
  country: string = '',
  meta?: Record<string, unknown>,
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    process.env.NODE_ENV !== 'production' ||
    (process.env.CI && !process.env.VERCEL)
  )
    return;

  // Fire-and-forget logging to Supabase with enhanced error tracking
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
      meta: meta || null,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error('[PROXY-LOG-ERROR] Supabase returned non-OK status:', {
          status: response.status,
          statusText: response.statusText,
          botName,
          path,
          recordStatus: status,
        });
      }
    })
    .catch((err) => {
      console.error('[PROXY-LOG-ERROR] Failed to persist bot hit:', {
        error: err.message || String(err),
        botName,
        path,
        recordStatus: status,
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        env: process.env.NODE_ENV,
      });
    });
}

export function proxy(request: NextRequest) {
  const url = new URL(request.url);
  // Extract Geo Info (Vercel specific header, as request.geo is deprecated in Next 15+)
  const country = request.headers.get('x-vercel-ip-country') || '';
  const referer = request.headers.get('referer') || '';

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

  // 0.1 Trailing Slash Normalization (Fix for strict bot matching)
  // Redirect /path/ -> /path (excluding root /)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    const newUrl = new URL(url);
    newUrl.pathname = url.pathname.slice(0, -1);
    return NextResponse.redirect(newUrl, { status: 308 }); // 308 Permanent Redirect
  }

  const userAgent = request.headers.get('user-agent') || '';
  const path = url.pathname;

  // --- Priority 0: Critical Path Exceptions & Utility Bots ---
  // 0.1 Standard Files
  if (path === '/robots.txt' || path === '/sitemap.xml') {
    return NextResponse.next();
  }

  // 0.2 Utility Bots & Internal Warmup (Silent Bypass: No security checks, no logging)
  if (UTILITY_BOTS_PATTERN.test(userAgent) || INTERNAL_WARMUP_PATTERN.test(userAgent)) {
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
    logBotHit('Malicious-Scanner', path, userAgent, 403, country, {
      referer,
      malicious_pattern: 'wp/php/env/git',
    });
    return new Response('Access Denied: Path is not permitted.', { status: 403 });
  }

  // --- Security Rule 2: Whitelist Search Engines (Baidu, Google, Bing, etc) ---
  if (SEARCH_ENGINE_BOTS_PATTERN.test(userAgent)) {
    const specificBotName = extractSearchEngineName(userAgent);
    logBotHit(specificBotName, path, userAgent, 200, country, {
      referer,
      search_engine_match: true,
      method: request.method,
    });

    // Pass x-current-path header so not-found.tsx can log the correct path for 404s
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-current-path', path);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- Security Rule 4: SEO Scrapers & Aggressive Bots (Cloudflare Style) ---
  if (SEO_SCRAPER_BOTS_PATTERN.test(userAgent)) {
    console.warn(`[BOT-BLOCKED] Scraper: ${userAgent} | Path: ${path}`);
    logBotHit('SEO-Scraper', path, userAgent, 403, country, { referer });
    return new Response('Access Denied: Automated scraping is not permitted.', { status: 403 });
  }

  // --- Security Rule 5: Specific AI & Archive Bots ---
  if (AI_ARCHIVE_BOTS_PATTERN.test(userAgent)) {
    console.warn(`[BOT-BLOCKED] AI/Archive: ${userAgent} | Path: ${path}`);
    logBotHit('AI-Bot', path, userAgent, 403, country, { referer });
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
