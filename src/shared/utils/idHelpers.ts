import { ARTICLE_ID_PREFIX } from '@/lib/constants';

export const toShortId = (fullId: string): string => {
  if (!fullId) return '';
  return fullId.replace(ARTICLE_ID_PREFIX, '');
};

export const toFullId = (shortId: string): string => {
  if (!shortId) return '';
  // If it starts with the prefix, it's already full.
  if (shortId.startsWith(ARTICLE_ID_PREFIX)) return shortId;
  // If it contains a colon, assume it's another type of full ID (e.g. urn:uuid:...) and don't add the prefix.
  if (shortId.includes(':')) return shortId;

  return `${ARTICLE_ID_PREFIX}${shortId}`;
};
