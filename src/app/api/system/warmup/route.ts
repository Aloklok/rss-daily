import { NextResponse } from 'next/server';

import { getSitemapUrls } from '../../../lib/sitemap-helper';

const CONCURRENCY = 5;

// Vercel Cron requires specific handling
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for hobby plan

interface WarmupResult {
  url: string;
  status: number | string;
  timeMs: number;
}

async function warmUpUrl(url: string): Promise<WarmupResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Vercel-Internal-Warmup/1.0',
      },
    });
    return { url, status: res.status, timeMs: Date.now() - start };
  } catch {
    return { url, status: 'ERROR', timeMs: Date.now() - start };
  }
}

export async function GET(request: Request) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require it for cron jobs (but allow manual testing in dev)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow Vercel Cron (it sends the secret automatically)
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.includes('Vercel Cron')) {
      // Still allow for testing - just log a warning
      console.warn('[Warmup] Request without valid CRON_SECRET');
    }
  }

  const startTime = Date.now();
  const results: WarmupResult[] = [];

  try {
    // 1. Get URLs based on 'lang' param
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'all'; // 'zh', 'en', or 'all'

    // Now unified with GitHub Actions logic
    const urls: string[] = [];

    if (lang === 'zh' || lang === 'all') {
      const zhSitemapItems = await getSitemapUrls('zh');
      urls.push(...zhSitemapItems.map((item) => item.url));
    }

    if (lang === 'en' || lang === 'all') {
      const enSitemapItems = await getSitemapUrls('en');
      urls.push(...enSitemapItems.map((item) => item.url));
    }

    // Process in batches for concurrency control
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(warmUpUrl));
      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter((r) => r.status === 200).length;

    return NextResponse.json({
      success: true,
      message: `Warmed up ${successCount}/${results.length} pages in ${totalTime}ms`,
      executionRegion: process.env.VERCEL_REGION || 'local',
      ingressRegion: request.headers.get('x-vercel-id')?.split('::')[0] || 'unknown',
      note: 'Results truncated to last 10 items for brevity. Check summary for total count.',
      results: results.slice(0, 10), // Only return first 10 for brevity
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
        totalTimeMs: totalTime,
      },
    });
  } catch (error) {
    console.error('[Warmup] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
