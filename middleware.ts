// @ts-ignore Vercel 会在边缘环境中自动提供全局类型
export default function middleware(request: Request) {

    const url = new URL(request.url);
    const accessToken = process.env.ACCESS_TOKEN;

    if (!accessToken) {
        // If no access token is configured, allow access (or maybe block? assuming allow for now based on "public access")
        // But strictly speaking, if it's not configured, maybe we should just proceed.
        return;
    }

    const urlToken = url.searchParams.get('token');

    // 1. URL Token 鉴权 (Admin Login)
    if (urlToken === accessToken) {
        const response = new Response(null, {
            status: 307,
            headers: {
                'Location': url.origin, // Redirect to clean URL
                'Set-Cookie': `site_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 90}`,
            },
        });
        return response;
    }

    // 2. Cookie 鉴权 (Check if already logged in as Admin)
    // We don't strictly need to block if cookie is missing/invalid anymore, 
    // because we want to allow public access.
    // The API routes will handle the strict checks for write operations.

    // So, we just let the request proceed.
    return;
}

// 高性能 + 高安全性的 Matcher
// 它只匹配“页面路由”（不含 . ），而不匹配静态文件
export const config = {
    matcher: [
        '/((?!api/|_vercel/|.+\..+).*)',
    ],
};