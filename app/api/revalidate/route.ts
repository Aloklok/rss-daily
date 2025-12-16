import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const decodedTag = decodeURIComponent(tag);
    // Revalidate the specific stream page
    revalidatePath(`/stream/${decodedTag}`);

    // Also revalidate the homepage as it might contain recent stream items
    revalidatePath('/');

    console.log(`[Revalidate] Successfully revalidated stream for tag: ${decodedTag}`);
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (_err: unknown) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
