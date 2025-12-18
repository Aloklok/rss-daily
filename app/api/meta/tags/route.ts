import { NextResponse } from 'next/server';
import { getFreshRssClient } from '@/lib/server/apiUtils';
import { Tag } from '@/types';

export const dynamic = 'force-dynamic';

interface FreshRssTag {
  id: string;
  type: string;
  count?: number;
}

export async function GET(): Promise<NextResponse> {
  const freshRss = getFreshRssClient();

  try {
    const data = await freshRss.get<{ tags: FreshRssTag[] }>('/tag/list', {
      output: 'json',
      with_counts: '1',
    });
    const categories: Tag[] = [];
    const tags: Tag[] = [];

    if (data.tags) {
      data.tags.forEach((item) => {
        const label = decodeURIComponent(item.id.split('/').pop() || '');

        if (item.id.includes('/state/com.google/') || item.id.includes('/state/org.freshrss/')) {
          return;
        }

        if (item.type === 'folder') {
          categories.push({ id: item.id, label, count: item.count });
        } else {
          tags.push({ id: item.id, label, count: item.count });
        }
      });
    }

    const sortByName = (a: { label: string }, b: { label: string }) =>
      a.label.localeCompare(b.label, 'zh-Hans-CN');

    return NextResponse.json({
      categories: categories.sort(sortByName),
      tags: tags.sort(sortByName),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error fetching categories and tags', error: errorMessage },
      { status: 500 },
    );
  }
}
