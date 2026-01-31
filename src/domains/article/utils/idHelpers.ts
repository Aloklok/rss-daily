// Article Core Domain - ID Helpers
// 文章 ID 转换工具函数

import { ARTICLE_ID_PREFIX } from '@/domains/article/constants';

/**
 * 将 FreshRSS 完整 ID 转换为简短 ID
 * @example toShortId('tag:google.com,2005:reader/item/000642d52cde0249') => '000642d52cde0249'
 */
export const toShortId = (fullId: string): string => {
  if (!fullId) return '';
  return fullId.toLowerCase().replace(ARTICLE_ID_PREFIX.toLowerCase(), '');
};

/**
 * 将简短 ID 转换为 FreshRSS 完整 ID
 * @example toFullId('000642d52cde0249') => 'tag:google.com,2005:reader/item/000642d52cde0249'
 */
export const toFullId = (shortId: string): string => {
  if (!shortId) return '';
  const id = shortId.trim().toLowerCase();
  // If it starts with the prefix, it's already full.
  if (id.startsWith(ARTICLE_ID_PREFIX)) return id;
  // If it contains a colon, assume it's another type of full ID (e.g. urn:uuid:...) and don't add the prefix.
  if (id.includes(':')) return id;

  return `${ARTICLE_ID_PREFIX}${id}`;
};
