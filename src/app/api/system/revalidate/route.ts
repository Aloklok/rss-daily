import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prewarmCache } from '@/shared/utils/server-prewarm';
import { generateEmbedding } from '@/domains/intelligence/services/embeddings';
import { createClient } from '@supabase/supabase-js';

// Init Supabase Client for updating embeddings
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory simple cache to throttle rapid-fire revalidates for the same date
// (e.g. n8n pushing 50 rows in a row)
const lastRevalidated: Record<string, number> = {};
const REVALIDATE_THROTTLE_MS = 10000; // 10 seconds

async function handleRevalidate(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get('secret');
  const tagParam = request.nextUrl.searchParams.get('tag');

  // Check authentication
  const isSecretValid = secret === process.env.REVALIDATION_SECRET;
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('site_token');
  const isCookieValid = tokenCookie?.value === process.env.ACCESS_TOKEN;

  if (!isSecretValid && !isCookieValid) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  // OPTION A: Explicit Tag provided in query
  if (tagParam) {
    revalidateTag('briefing-data', 'max');
    return NextResponse.json({ revalidated: true, tag: tagParam });
  }

  // OPTION B: Supabase Webhook Payload (Smart Detection)
  try {
    const body = await request.json();
    console.log('[Webhook] Received revalidation request from Supabase');

    // Extract article data from Supabase Webhook structure
    const article = body.record || body;

    // --- NEW: Auto-Embedding for n8n/Manual pushes ---
    // If embedding is missing and we have enough content, generate it
    if (!article.embedding) {
      const keywordsStr = Array.isArray(article.keywords) ? article.keywords.join(' ') : '';
      const contentToEmbed =
        `${article.title || ''} ${article.category || ''} ${keywordsStr} ${article.summary || ''} ${article.tldr || ''}`.trim();
      if (contentToEmbed.length > 10) {
        try {
          console.log(`[Webhook] Auto-generating embedding for: ${article.title}`);
          const embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT');
          if (embedding) {
            await supabase.from('articles').update({ embedding }).eq('id', String(article.id));
            console.log(`[Webhook] Successfully updated embedding for ${article.id}`);
          }
        } catch (embedError) {
          console.error('[Webhook] Failed to auto-generate embedding:', embedError);
        }
      }
    }

    // Use n8n_processing_date or published to determine the date page
    const dateStr = article.n8n_processing_date || article.published;

    if (dateStr) {
      const date = dateStr.split('T')[0]; // Extract YYYY-MM-DD

      // Throttling: Check if we just revalidated this date
      const now = Date.now();
      if (lastRevalidated[date] && now - lastRevalidated[date] < REVALIDATE_THROTTLE_MS) {
        console.log(
          `[Webhook] Throttling: Skipping revalidate for ${date} (last one was < 10s ago)`,
        );
        return NextResponse.json({ message: 'Throttled', date });
      }

      lastRevalidated[date] = now;

      // Granular Invalidation
      revalidateTag(`briefing-data-${date}`, 'max');
      revalidatePath(`/date/${date}`);

      // Invalidate sidebar dates list when new date appears
      // This ensures the sidebar updates immediately when content is published after midnight
      revalidateTag('available-dates', 'max');

      // Homepage if today
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
        new Date(),
      );
      if (date === today) {
        revalidatePath('/');
      }

      console.log(`[Webhook] Smart Revalidated Date: ${date}`);

      // CDN Pre-warming
      prewarmCache(date);

      return NextResponse.json({ revalidated: true, date });
    }

    // Default Fallback: Clear everything if we can't determine the date (Safest)
    revalidateTag('briefing-data', 'max');
    return NextResponse.json({ revalidated: true, tag: 'all-briefing-data' });
  } catch (_error: any) {
    console.warn(
      '[Webhook] Could not parse body or extract date, performing global revalidate as fallback',
    );
    revalidateTag('briefing-data', 'max');
    return NextResponse.json({ revalidated: true, fallback: true });
  }
}

export async function GET(request: NextRequest) {
  return handleRevalidate(request);
}

export async function POST(request: NextRequest) {
  return handleRevalidate(request);
}
