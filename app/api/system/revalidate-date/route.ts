import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { prewarmCache } from '@/lib/server/prewarm';

/**
 * Targeted revalidation for a specific date.
 * Used by hooks (Mark all as read, Star, etc.) or Regenerate Briefing button.
 */
export async function POST(request: NextRequest) {
  try {
    const { date, secret } = await request.json();

    // 1. Authentication Check
    const isSecretValid = secret === process.env.REVALIDATION_SECRET;
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('site_token');
    const isCookieValid = tokenCookie?.value === process.env.ACCESS_TOKEN;

    if (!isSecretValid && !isCookieValid) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validation
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
    }

    // 3. Precise Invalidation
    // A. Invalidate the Data Cache (unstable_cache)
    revalidateTag(`briefing-data-${date}`, 'max');

    // B. Invalidate the Page Cache (ISR)
    revalidatePath(`/date/${date}`);

    // C. Optional: Invalidate Homepage if it's today
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
      new Date(),
    );
    if (date === today) {
      revalidatePath('/');
    }

    console.log(`[Granular Revalidate] Successfully revalidated date: ${date}`);

    // CDN Pre-warming
    prewarmCache(date);
    return NextResponse.json({
      success: true,
      date,
      revalidatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Granular Revalidate] Error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
