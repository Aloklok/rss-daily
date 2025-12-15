import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { submitUrlsToIndexNow } from '@/utils/indexnow';
import { getSitemapUrls } from '../../lib/sitemap-helper';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

async function isAuthenticated(request: Request): Promise<boolean> {
    if (!ACCESS_TOKEN) return true; // Open access if no token configured (warning logged in construction?)

    const url = new URL(request.url);

    // 1. Check URL param
    const tokenParam = url.searchParams.get('token');
    if (tokenParam === ACCESS_TOKEN) return true;

    // 2. Check Cookie
    const cookieStore = await cookies();
    const siteToken = cookieStore.get('site_token')?.value;
    if (siteToken === ACCESS_TOKEN) return true;

    return false;
}

export async function GET(request: Request): Promise<NextResponse> {
    if (!(await isAuthenticated(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    let urlsToSubmit: string[] = [];

    if (url) {
        urlsToSubmit = [url];
    } else {
        // Auto-submit all sitemap URLs if no specific URL provided
        console.log('[IndexNow] No URL provided, fetching entire sitemap...');
        const sitemapItems = await getSitemapUrls();
        urlsToSubmit = sitemapItems.map(item => item.url);
    }

    if (urlsToSubmit.length === 0) {
        return NextResponse.json({ error: 'No URLs found to submit' }, { status: 404 });
    }

    const success = await submitUrlsToIndexNow(urlsToSubmit);

    return NextResponse.json({
        success,
        message: success
            ? `Submitted ${urlsToSubmit.length} URLs to IndexNow`
            : 'Submission failed',
        count: urlsToSubmit.length,
        urls: urlsToSubmit
    });
}

export async function POST(request: Request): Promise<NextResponse> {
    if (!(await isAuthenticated(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let urls: string[] = [];

        try {
            const body = await request.json();
            if (Array.isArray(body.urls)) {
                urls = body.urls;
            }
        } catch (_e: unknown) {
            // Body might be empty, which is fine if we want full sync
        }

        if (urls.length === 0) {
            console.log('[IndexNow] POST with empty URLs, fetching entire sitemap...');
            const sitemapItems = await getSitemapUrls();
            urls = sitemapItems.map(item => item.url);
        }

        if (urls.length === 0) {
            return NextResponse.json({ error: 'No URLs found to submit' }, { status: 404 });
        }

        const success = await submitUrlsToIndexNow(urls);

        return NextResponse.json({
            success,
            message: success ? `Submitted ${urls.length} URLs to IndexNow` : 'Submission failed',
            count: urls.length
        });
    } catch (_error: unknown) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
