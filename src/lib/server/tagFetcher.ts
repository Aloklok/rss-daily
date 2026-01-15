import { Tag } from '../../types';
import { getAvailableFilters } from '@/domains/reading/services';

export async function fetchTagsServer(): Promise<{ categories: Tag[]; tags: Tag[] }> {
  try {
    return await getAvailableFilters();
  } catch (error) {
    console.error('Error fetching categories and tags:', error);
    return { categories: [], tags: [] };
  }
}
