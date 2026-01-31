import { NextRequest, NextResponse } from 'next/server';
import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { verifyAdmin } from '@/domains/interaction/services/admin-auth';
import { STAR_TAG, READ_TAG } from '@/domains/article/constants';

interface FreshRssItem {
  id: string;
  categories: string[];
  annotations?: { id: string }[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if we are doing a state update or just fetching states
  // We can differentiate by looking at the body payload
  try {
    const body = await request.json();

    // Case 1: Fetching Article States (originally api/article-states)
    // Payload: { articleIds: [...] } only
    // We should probably check if it's ONLY articleIds and NO action/update params to be safe,
    // or just checking if 'action' or 'tagsToAdd' is missing is enough.
    // However, the clearer way might be to check if the user is authenticated for updates.
    // Fetching states is generally public (for rendering UI), but let's check the original logic.
    // Original article-states did NOT verify admin. Original update-state DID verify admin.

    // Let's implement a heuristic: if "action", "tagsToAdd", "tagsToRemove" are present, it's an update.
    const isUpdate =
      body.action ||
      typeof body.isAdding !== 'undefined' ||
      (body.tagsToAdd && body.tagsToAdd.length > 0) ||
      (body.tagsToRemove && body.tagsToRemove.length > 0);

    if (isUpdate) {
      return handleUpdateState(request, body);
    } else {
      return handleGetStates(body);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Internal Server Error', error: errorMessage },
      { status: 500 },
    );
  }
}

async function handleGetStates(body: any): Promise<NextResponse> {
  const { articleIds } = body;

  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    return NextResponse.json({});
  }

  try {
    const freshRss = getFreshRssClient();
    const formData = new URLSearchParams();
    articleIds.forEach((id: string | number) => formData.append('i', String(id)));

    // Fetch from FreshRSS
    const data = await freshRss.post<{ items: FreshRssItem[] }>(
      '/stream/items/contents?output=json&excludeContent=1',
      formData,
    );

    const states: { [key: string]: string[] } = {};
    if (data.items) {
      data.items.forEach((item: FreshRssItem) => {
        // Merge categories (folders/labels) and annotations (user states like starred/read)
        const annotationTags = (item.annotations || []).map((anno) => anno.id).filter(Boolean);
        const allTags = [...(item.categories || []), ...annotationTags];
        states[item.id] = [...new Set(allTags)];
      });
    }

    return NextResponse.json(states);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching article states', error: errorMessage },
      { status: 500 },
    );
  }
}

async function handleUpdateState(request: NextRequest, body: any): Promise<NextResponse> {
  // 1. Verify Verification
  if (!(await verifyAdmin())) {
    return NextResponse.json({ message: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const { articleId, articleIds, action, isAdding, tagsToAdd, tagsToRemove } = body;

  // 2. Validate Params
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

  try {
    const freshRss = getFreshRssClient();
    const shortLivedToken = await freshRss.getActionToken();
    const params = new URLSearchParams();

    // Support single ID or array of IDs
    const ids = articleIds && Array.isArray(articleIds) ? articleIds : [articleId];
    ids.forEach((id: string | number) => params.append('i', String(id)));
    params.append('T', shortLivedToken);

    // Handle well-known actions (star/read)
    if (action && typeof isAdding === 'boolean') {
      const tagMap: Record<string, string> = {
        star: STAR_TAG,
        read: READ_TAG,
      };
      const tag = tagMap[action as 'star' | 'read'];
      if (tag) {
        params.append(isAdding ? 'a' : 'r', tag);
      }
    }

    // Handle custom tags
    if (tagsToAdd && Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
      tagsToAdd.forEach((tag: string) => params.append('a', tag));
    }
    if (tagsToRemove && Array.isArray(tagsToRemove) && tagsToRemove.length > 0) {
      tagsToRemove.forEach((tag: string) => params.append('r', tag));
    }

    // Execute update
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
