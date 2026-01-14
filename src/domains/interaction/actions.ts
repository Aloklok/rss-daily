'use server';

import { getFreshRssClient } from '@/shared/infrastructure/fresh-rss';
import { verifyAdmin } from './services/admin-auth';
import { STAR_TAG, READ_TAG } from './constants';

type ActionResponse = {
  success: boolean;
  message?: string;
};

export async function markAsRead(articleIds: string[]): Promise<ActionResponse> {
  return updateTags({ articleIds, action: 'read', isAdding: true });
}

export async function toggleStar(articleId: string, isStarred: boolean): Promise<ActionResponse> {
  return updateTags({ articleIds: [articleId], action: 'star', isAdding: isStarred });
}

export async function updateTags(params: {
  articleIds: string[];
  action?: 'read' | 'star';
  isAdding?: boolean;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
}): Promise<ActionResponse> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const { articleIds, action, isAdding, tagsToAdd = [], tagsToRemove = [] } = params;

  if (!articleIds || articleIds.length === 0) {
    return { success: false, message: 'No article IDs provided' };
  }

  try {
    const freshRss = getFreshRssClient();
    const shortLivedToken = await freshRss.getActionToken();
    const queryParams = new URLSearchParams();

    articleIds.forEach((id) => queryParams.append('i', String(id)));
    queryParams.append('T', shortLivedToken);

    // Handle well-known actions
    if (action && typeof isAdding === 'boolean') {
      const tagMap = { star: STAR_TAG, read: READ_TAG };
      const tag = tagMap[action];
      if (tag) {
        queryParams.append(isAdding ? 'a' : 'r', tag);
      }
    }

    // Handle custom tags
    tagsToAdd.forEach((tag) => queryParams.append('a', tag));
    tagsToRemove.forEach((tag) => queryParams.append('r', tag));

    await freshRss.post('/edit-tag', queryParams);

    // [Interaction] Log success (dev-only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Interaction] Updated tags for ${articleIds.length} articles.`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Interaction] Action Error:', error);
    return { success: false, message: 'Failed to update tags' };
  }
}
