import { NextRequest, NextResponse } from 'next/server';
import { processRevalidation } from '@/domains/system/services/revalidate-service';
import { cookies } from 'next/headers';

/**
 * [Revalidate Endpoint For CHINESE]
 * Triggered by Supabase Webhook on 'articles' table.
 */
async function handleRevalidate(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get('secret');

  // Auth Check (Keep controller logic lightweight)
  const isSecretValid = secret === process.env.REVALIDATION_SECRET;
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('site_token');
  const isCookieValid = tokenCookie?.value === process.env.ACCESS_TOKEN;

  if (!isSecretValid && !isCookieValid) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    let body = {};
    if (request.method === 'POST') {
      try {
        body = await request.json();
      } catch (_e) {
        console.warn('[Revalidate-ZH] Empty or invalid JSON body');
      }
    }

    console.log('[Revalidate-ZH] Triggered. Body:', JSON.stringify(body, null, 2));
    const result = await processRevalidation(body, { lang: 'zh', table: 'articles' });
    console.log('[Revalidate-ZH] Result:', JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Revalidate-ZH] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRevalidate(request);
}

export async function POST(request: NextRequest) {
  return handleRevalidate(request);
}
