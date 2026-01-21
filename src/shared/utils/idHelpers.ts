import { ARTICLE_ID_PREFIX } from '@/domains/reading/constants';

export const toShortId = (fullId: string): string => {
  if (!fullId) return '';
  return fullId.toLowerCase().replace(ARTICLE_ID_PREFIX.toLowerCase(), '');
};

export const toFullId = (shortId: string): string => {
  if (!shortId) return '';
  const id = shortId.trim().toLowerCase();
  // If it starts with the prefix, it's already full.
  if (id.startsWith(ARTICLE_ID_PREFIX)) return id;
  // If it contains a colon, assume it's another type of full ID (e.g. urn:uuid:...) and don't add the prefix.
  if (id.includes(':')) return id;

  return `${ARTICLE_ID_PREFIX}${id}`;
};
