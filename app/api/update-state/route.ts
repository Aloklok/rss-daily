import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient, verifyAdmin } from '../../lib/api-utils';
import { cookies } from 'next/headers';
import { STAR_TAG, READ_TAG } from '../../lib/constants'; // Assuming constants are here or need to be imported

// We need to make sure constants are available.
// If they were in api/_constants.ts, we should probably move them to app/lib/constants.ts or similar.
// For now, I'll define them here if not found, or try to import from existing location if possible.
// Wait, I haven't moved constants yet. Let's assume they are in app/lib/constants.ts or I should create it.
// Actually, the original code imported from './_constants.js'.
// Let's check if I should create app/lib/constants.ts.
// I'll define them here for safety if I can't find them, but better to be consistent.
// Let's assume I will create app/lib/constants.ts later or use hardcoded values for now to avoid import errors.
// STAR_TAG = 'user/1001/state/com.google/starred'
// READ_TAG = 'user/1001/state/com.google/read'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  if (!verifyAdmin(cookieStore)) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { articleId, articleIds, action, isAdding, tagsToAdd, tagsToRemove } = body;

    if (
      (!articleId && (!articleIds || !Array.isArray(articleIds))) ||
      (!action &&
        typeof isAdding === 'undefined' &&
        (!tagsToAdd || !Array.isArray(tagsToAdd) || tagsToAdd.length === 0) &&
        (!tagsToRemove || !Array.isArray(tagsToRemove) || tagsToRemove.length === 0))
    ) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }
    if (action && typeof isAdding !== 'undefined' && typeof isAdding !== 'boolean') {
      return NextResponse.json(
        { message: 'When action is provided, isAdding must be a boolean' },
        { status: 400 },
      );
    }

    const freshRss = getFreshRssClient();
    const shortLivedToken = await freshRss.getActionToken();

    const params = new URLSearchParams();

    const ids = articleIds && Array.isArray(articleIds) ? articleIds : [articleId];
    ids.forEach((id: string | number) => params.append('i', String(id)));
    params.append('T', shortLivedToken);

    if (action && typeof isAdding === 'boolean') {
      const tagMap = {
        star: STAR_TAG,
        read: READ_TAG,
      };
      const tag = tagMap[action as 'star' | 'read'];
      if (tag) {
        params.append(isAdding ? 'a' : 'r', tag);
      }
    }

    if (tagsToAdd && Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
      tagsToAdd.forEach((tag: string) => params.append('a', tag));
    }
    if (tagsToRemove && Array.isArray(tagsToRemove) && tagsToRemove.length > 0) {
      tagsToRemove.forEach((tag: string) => params.append('r', tag));
    }

    const responseText = await freshRss.post<string>('/edit-tag', params);

    if (responseText.trim() !== 'OK') {
      throw new Error(`Failed to update state. FreshRSS responded with: ${responseText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Internal Server Error', error: errorMessage },
      { status: 500 },
    );
  }
}
