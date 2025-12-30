import { getFreshRssClient } from './apiUtils';
import { Tag } from '../../types';

interface FreshRssTag {
  id: string;
  type: string;
  count?: number;
}

export async function fetchTagsServer(): Promise<{ categories: Tag[]; tags: Tag[] }> {
  try {
    const freshRss = getFreshRssClient();
    const data = await freshRss.get<{ tags: FreshRssTag[] }>('/tag/list', {
      output: 'json',
      with_counts: '1',
    });

    const categories: Tag[] = [];
    const tags: Tag[] = [];

    if (data.tags) {
      data.tags.forEach((item) => {
        const label = decodeURIComponent(item.id.split('/').pop() || '');

        // Skip internal states (Google/FreshRSS system states)
        if (item.id.includes('/state/com.google/') || item.id.includes('/state/org.freshrss/')) {
          return;
        }

        // FreshRSS returns 'unread_count' for tags, and no count for folders
        const itemCount = (item as any).count || (item as any).unread_count;

        if (item.type === 'folder') {
          categories.push({ id: item.id, label, count: itemCount });
        } else {
          tags.push({ id: item.id, label, count: itemCount });
        }
      });
    }

    const sortByName = (a: { label: string }, b: { label: string }) =>
      a.label.localeCompare(b.label, 'zh-Hans-CN');

    return {
      categories: categories.sort(sortByName),
      tags: tags.sort(sortByName),
    };
  } catch (error) {
    console.error('Error fetching categories and tags:', error);
    return { categories: [], tags: [] };
  }
}
