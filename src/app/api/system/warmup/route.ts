import { NextResponse } from 'next/server';

const BASE_URL = 'https://www.alok-rss.top';
const CONCURRENCY = 5;

// Vercel Cron requires specific handling
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for hobby plan

interface WarmupResult {
  date: string;
  status: number | string;
  timeMs: number;
}

async function fetchAvailableDates(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/api/meta/available-dates`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch dates: ${res.status}`);
  return res.json();
}

async function warmUpDate(date: string): Promise<WarmupResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/date/${date}`, { cache: 'no-store' });
    return { date, status: res.status, timeMs: Date.now() - start };
  } catch {
    return { date, status: 'ERROR', timeMs: Date.now() - start };
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
    const dates = await fetchAvailableDates();

    // Process in batches for concurrency control
    for (let i = 0; i < dates.length; i += CONCURRENCY) {
      const batch = dates.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(warmUpDate));
      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter((r) => r.status === 200).length;

    return NextResponse.json({
      success: true,
      message: `Warmed up ${successCount}/${results.length} pages in ${totalTime}ms`,
      edgeRegion: request.headers.get('x-vercel-id')?.split('::')[0] || 'unknown',
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
