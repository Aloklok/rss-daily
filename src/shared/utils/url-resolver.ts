import { Filter } from '@/types';
import { resolveSlugId } from '@/domains/reading/utils/slug-helper';

/**
 * Resolves a Filter object from the current pathname, handling i18n prefixes.
 * This ensures the Sidebar state (active filter) matches the URL, even after a hard refresh or language switch.
 *
 * @param pathname - The current pathname (e.g., "/en/stream/tag/123" or "/date/2023-01-01")
 * @returns The corresponding Filter object or null if no filter matches.
 */
export function resolveFilterFromPathname(pathname: string): Filter | null {
  if (!pathname) return null;

  // 1. Remove Language Prefix (/en) to normalize path
  const normalizedPath = pathname.replace(/^\/en/, '') || '/';

  // 2. Exact Match: Trends
  if (normalizedPath === '/trends') {
    return { type: 'trends', value: '' };
  }

  // 3. Pattern Match: Date (/date/YYYY-MM-DD)
  const dateMatch = normalizedPath.match(/^\/date\/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return { type: 'date', value: dateMatch[1] };
  }

  // 4. Pattern Match: Tag (/stream/tag/SLUG)
  const tagMatch = normalizedPath.match(/^\/stream\/tag\/(.+)$/);
  if (tagMatch) {
    const slug = decodeURIComponent(tagMatch[1]);
    const headerId = resolveSlugId(slug, 'tag');
    return { type: 'tag', value: headerId };
  }

  // 5. Pattern Match: Category (/stream/category/SLUG)
  const categoryMatch = normalizedPath.match(/^\/stream\/category\/(.+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const headerId = resolveSlugId(slug, 'category');
    return { type: 'category', value: headerId };
  }

  // 6. Pattern Match: Search (Handled via Query Params usually)

  return null;
}
