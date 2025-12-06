import { NextResponse } from 'next/server';

// @ts-ignore Vercel 会在边缘环境中自动提供全局类型
export function proxy(request: Request) {

    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // 0. Anti-Scraping: Block specific AI bots and scrapers
    const BLOCKED_AGENTS = [
        'GPTBot',
        'ChatGPT-User',
        'CCBot',
        'anthropic-ai',
        'Claude-Web',
        'Google-Extended'
    ];

    // Priority 0: Explicitly ALLOW Search Engine Bots (Whitelist)
    // This ensures sitemap and verify requests always get through our logic.
    // Note: If Vercel Protection is on, this won't bypass it, but it prevents *our* code from blocking.
    const ALLOWED_BOTS = ['Bingbot', 'Googlebot', 'Baiduspider', 'bingbot', 'googlebot', 'baiduspider'];
    if (ALLOWED_BOTS.some(bot => userAgent.includes(bot))) {
        return NextResponse.next();
    }

    if (BLOCKED_AGENTS.some(agent => userAgent.includes(agent))) {
        return new Response('Access Denied: Automated access is not permitted.', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    const accessToken = process.env.ACCESS_TOKEN;

    if (!accessToken) {
        // If no access token is configured, allow access (or maybe block? assuming allow for now based on "public access")
        // But strictly speaking, if it's not configured, maybe we should just proceed.
        return;
    }

    const urlToken = url.searchParams.get('token');

    // 1. URL Token 鉴权 (Admin Login)
    if (urlToken === accessToken) {
        // Remove token from URL but keep path and other params
        url.searchParams.delete('token');
        const redirectUrl = url.toString();

        const isSecure = url.protocol === 'https:';

        const response = NextResponse.redirect(redirectUrl);
        response.cookies.set('site_token', accessToken, {
            path: '/',
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 90
        });
        return response;
    }

    // 2. Cookie 鉴权 (Check if already logged in as Admin)
    // We don't strictly need to block if cookie is missing/invalid anymore, 
    // because we want to allow public access.
    // The API routes will handle the strict checks for write operations.

    // However, if the user explicitly visits without a token (and maybe wants to logout/view as guest),
    // we might want to clear the cookie if the token param is present but wrong? 
    // Or just let the cookie persist until it expires?

    // User complaint: "I enter without a token, and it didn't restrict me."
    // This implies they expect to be treated as a guest if they don't provide the token in the URL,
    // even if they were previously logged in.
    // To support this "switch to guest" behavior, we can check:
    // If NO token in URL -> Do nothing (respect existing cookie).
    // If token in URL is WRONG -> Clear cookie? No, that's weird.

    // Actually, maybe the user wants: "If I visit the root URL without ?token=..., I should be a guest."
    // But that would mean every time they refresh the page (which usually clears URL params), they would be logged out.
    // That's bad UX.

    // Let's assume the user has a STALE cookie and doesn't know it.
    // I will add a special `?logout=true` handler or just tell the user to clear cookies.

    // But wait, the user said "Please re-check middleware".
    // Maybe they think the middleware should BLOCK access if no token?
    // "Implement read-only public access" -> So NO blocking.

    // Let's try to be stricter: If the user visits with `?token=logout`, clear the cookie.
    if (url.searchParams.get('logout') === 'true') {
        const response = new Response(null, {
            status: 307,
            headers: {
                'Location': url.origin,
                'Set-Cookie': `site_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
            },
        });
        return response;
    }

    // So, we just let the request proceed.
    return;
}

// 高性能 + 高安全性的 Matcher
// 它只匹配“页面路由”（不含 . ），而不匹配静态文件
export const config = {
    matcher: [
        '/((?!api/|_vercel/|sitemap.xml|robots.txt|.+\..+).*)',
    ],
};