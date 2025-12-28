import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';

async function handleRevalidate(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get('secret');
  const tag = request.nextUrl.searchParams.get('tag');

  // Check for secret provided via query param
  const isSecretValid = secret === process.env.REVALIDATION_SECRET;

  // Check for admin cookie
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('site_token');
  const isCookieValid = tokenCookie?.value === process.env.ACCESS_TOKEN;

  if (!isSecretValid && !isCookieValid) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  if (!tag) {
    return NextResponse.json({ message: 'Missing tag parameter' }, { status: 400 });
  }

  try {
    // Correctly revalidate the DATA cache tag (unstable_cache)
    revalidateTag(tag, 'max');

    console.log(`[Revalidate] Successfully revalidated tag: ${tag}`);
    return NextResponse.json({ revalidated: true, tag, now: Date.now() });
  } catch (_err: unknown) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRevalidate(request);
}

export async function POST(request: NextRequest) {
  return handleRevalidate(request);
}
