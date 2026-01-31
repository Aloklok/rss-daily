import {
  categoryTranslations,
  tagTranslations,
  feedTranslations,
  verdictTranslations,
  categoryEmojis,
  DictionaryValue,
} from '@/app/i18n/feed-dictionary';
import { CATEGORY_ORDER, UNCATEGORIZED_LABEL } from '@/domains/reading/constants';
import { FRESHRSS_LABEL_PREFIX } from '@/domains/article/constants';
import { Article } from '@/shared/types';

/**
 * Clean up the raw label from database/FreshRSS.
 * Example: 'user/-/label/AI' -> 'AI'
 */
export const normalizeLabel = (raw: string): string => {
  if (!raw) return '';
  // Special case for 'user/-/label/' prefix from FreshRSS
  return raw.replace(FRESHRSS_LABEL_PREFIX, ''); // Simplified string replacement
};

/**
 * Restore the FreshRSS prefix for API calls.
 * Example: 'AI' -> 'user/-/label/AI'
 */
export const restoreLabelPrefix = (label: string): string => {
  if (!label) return '';
  const clean = normalizeLabel(label);
  return `${FRESHRSS_LABEL_PREFIX}${clean}`;
};

/**
 * Get the priority weight based on keywords in CATEGORY_ORDER.
 */
export const getOrderIndex = (name: string): number => {
  const cleanName = normalizeLabel(name || '')
    .trim()
    .toLowerCase();
  // Also strip emoji for keyword matching

  const baseName = cleanName
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]|[\u{FE00}-\u{FE0F}]/gu, '')
    .trim();

  return CATEGORY_ORDER.findIndex(
    (keyword) =>
      baseName.includes(keyword.toLowerCase()) || cleanName.includes(keyword.toLowerCase()),
  );
};

/**
 * Sort a list of labels (either string[] or object with .id) according to priority and locale.
 */
export const sortLabels = <T extends string | { id: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const idA = typeof a === 'string' ? a : a.id;
    const idB = typeof b === 'string' ? b : b.id;

    const cleanA = normalizeLabel(idA);
    const cleanB = normalizeLabel(idB);

    // Special case: '未分类' or 'uncategorized'
    const isUnA = cleanA === UNCATEGORIZED_LABEL || cleanA.toLowerCase().includes('uncategorized');
    const isUnB = cleanB === UNCATEGORIZED_LABEL || cleanB.toLowerCase().includes('uncategorized');

    if (isUnA && !isUnB) return 1;
    if (!isUnA && isUnB) return -1;

    const indexA = getOrderIndex(idA);
    const indexB = getOrderIndex(idB);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return cleanA.localeCompare(cleanB, 'zh-Hans-CN');
  });
};

type LabelType = 'category' | 'tag' | 'feed' | 'verdict';

/**
 * Get the display label for a given raw label.
 * Handles normalization, translation (EN), and Emoji decoration (ZH).
 *
 * @param raw The raw label from the database (potentially with prefix)
 * @param type The type of label ('category', 'tag', 'feed')
 * @param lang The current language ('zh' | 'en')
 * @returns The formatted display string
 */
export const getDisplayLabel = (raw: string, type: LabelType, lang: 'zh' | 'en'): string => {
  const cleanKey = normalizeLabel(raw);

  // Handle Uncategorized consistently
  if (cleanKey === UNCATEGORIZED_LABEL || cleanKey.toLowerCase().includes('uncategorized')) {
    return lang === 'zh' ? '未分类' : 'Uncategorized';
  }

  // Chinese Logic: Ensure Emoji Presense (for categories)
  if (lang === 'zh') {
    if (type === 'category') {
      // If the key strictly matches the name without emoji, prepend emoji
      // But wait, what if cleanKey ALREADY has the emoji? "☁️ 基础设施"
      // We need to check if the emoji is already there.

      // Try stripping emoji to find the "base key" to lookup the declared emoji

      const baseKey = cleanKey
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]|[\u{FE00}-\u{FE0F}]/gu, '')
        .trim();
      const targetEmoji = categoryEmojis[baseKey] || categoryEmojis[cleanKey];

      if (targetEmoji && !cleanKey.includes(targetEmoji)) {
        return `${targetEmoji} ${cleanKey}`;
      }
    }
    return cleanKey;
  }

  // English Logic: Look up translation
  // CRITICAL FIX: Strip Emojis before looking up!
  // DB: "☁️ 基础设施" -> cleanKey: "☁️ 基础设施"
  // Dictionary Key: "基础设施"
  // We need "基础设施" to find "Cloud Infra".

  const lookupKey =
    type === 'category'
      ? cleanKey.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]|[\u{FE00}-\u{FE0F}]/gu, '').trim() // Strip Emojis & VS-16, keep semantic spaces
      : cleanKey;

  let map: Record<string, DictionaryValue>;
  switch (type) {
    case 'category':
      map = categoryTranslations;
      break;
    case 'tag':
      map = tagTranslations;
      break;
    case 'feed':
      map = feedTranslations;
      break;
    case 'verdict':
      map = verdictTranslations;
      break;
  }

  // If translation exists, return it. Otherwise fall back to the original clean key.
  // String cast for type safety with DictionaryValue
  const result = map[lookupKey] || cleanKey;
  return typeof result === 'string' ? result : result.label;
};

/**
 * Purify an article object for English views and filter out invalid tags (folders).
 */
export const purifyArticle = (
  article: Article,
  lang: 'zh' | 'en',
  validTagIds?: Set<string>,
): Article => {
  if (!article) return article;

  // 1. Filter tags first (Universal logic)
  let processedTags = article.tags || [];
  if (validTagIds) {
    processedTags = processedTags.filter((tag: any) => {
      const id = typeof tag === 'string' ? tag : tag.id;
      return validTagIds.has(id);
    });
  }

  // 2. Language-specific translation
  if (lang === 'zh') {
    return { ...article, tags: processedTags };
  }

  return {
    ...article,
    sourceName: getDisplayLabel(article.sourceName, 'feed', 'en'),
    tags: processedTags.map((tag: any) => {
      if (typeof tag === 'string') {
        return tag;
      }
      return {
        ...tag,
        label: getDisplayLabel(tag.label, 'tag', 'en'),
      };
    }),
    verdict: article.verdict
      ? {
          ...article.verdict,
          type: getDisplayLabel(article.verdict.type, 'verdict', 'en'),
        }
      : article.verdict,
    category: article.category
      ? getDisplayLabel(article.category, 'category', 'en')
      : article.category,
  };
};

/**
 * Batch purify multiple articles with optional tag filtering.
 */
export const purifyArticles = (
  articles: Article[],
  lang: 'zh' | 'en',
  validTagIds?: Set<string>,
): Article[] => {
  if (!articles) return articles;
  return articles.map((a) => purifyArticle(a, lang, validTagIds));
};

/**
 * Purify a subscription object for English views.
 */
export const purifySubscription = (sub: any, lang: 'zh' | 'en'): any => {
  if (lang === 'zh' || !sub) return sub;
  return {
    ...sub,
    // Keep sub.id as-is
    title: getDisplayLabel(sub.title, 'feed', 'en'),
    // category is often used as a grouping key, but it's okay to translate if UI uses it for display
    category: sub.category ? getDisplayLabel(sub.category, 'category', 'en') : sub.category,
  };
};

/**
 * Batch purify multiple subscriptions.
 */
export const purifySubscriptions = (subs: any[], lang: 'zh' | 'en'): any[] => {
  if (lang === 'zh' || !subs) return subs;
  return subs.map((s) => purifySubscription(s, lang));
};
