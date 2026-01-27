import {
    categoryTranslations,
    tagTranslations,
    feedTranslations,
    categoryEmojis,
} from '@/app/i18n/feed-dictionary';
import { restoreLabelPrefix } from './label-display';

// --- Types ---
type DictionaryType = typeof categoryTranslations;
export type StreamType = 'category' | 'tag' | 'mixed'; // mixed for backward compat or unknown

// --- Helper: Simple Slugify ---
// ... (slugify function remains same)
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/&/g, 'and')        // Replace & with 'and'
        .replace(/[^\w-]+/g, '')    // Remove all non-word chars
        .replace(/--+/g, '-');     // Replace multiple - with single -
}

/**
 * Get the slug for a given raw ID.
 */
export function getSlug(rawId: string): string {
    // Fix: Handle potential double-encoding or simple encoding
    const safeDecode = (str: string) => {
        try {
            return decodeURIComponent(decodeURIComponent(str));
        } catch (_e) {
            return decodeURIComponent(str);
        }
    };
    const normalize = (id: string) => {
        const decoded = safeDecode(id).split('/').pop() || '';
        // Fix: Strip emojis AND Variation Selectors (FE0F)
        // \uFE0F is often left behind when generic emoji ranges match the symbol but not the variant selector.
        // eslint-disable-next-line no-misleading-character-class
        return decoded.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '').trim();
    };
    const normalizedId = normalize(rawId);

    // Helper to check a specific dictionary
    const checkDict = (dict: DictionaryType): string | null => {
        // Try strict match first (e.g. "Frontend")
        const val = dict[normalizedId];

        // If not found, try matching against cleaned keys in dictionary?
        // No, dictionary keys are strictly defined. "工程实践" is the key.
        // Our normalize above should have handled it.

        if (!val) return null;
        if (typeof val === 'string') {
            // Remove Emoji from "☁️ Cloud Infra" -> "Cloud Infra" before slugifying
            // eslint-disable-next-line no-misleading-character-class
            const cleanText = val.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '').trim();
            return slugify(cleanText);
        }
        return val.slug;
    };

    // Try all dictionaries
    const slug = checkDict(categoryTranslations) ||
        checkDict(tagTranslations) ||
        checkDict(feedTranslations);

    if (slug) return slug;

    // Fallback
    return normalizedId.trim();
}

/**
 * Generate a full Link URL for a stream.
 */
export function getSlugLink(rawId: string, lang: 'zh' | 'en' = 'en', type: StreamType = 'mixed'): string {
    const slug = getSlug(rawId);
    const prefix = lang === 'en' ? '/en' : '';

    if (type === 'category') {
        return `${prefix}/stream/category/${slug}`;
    } else if (type === 'tag') {
        return `${prefix}/stream/tag/${slug}`;
    }

    // Fallback mixed route (deprecated eventually)
    return `${prefix}/stream/${slug}`;
}

/**
 * Resolve a Slug back to a Raw ID (or reasonable best guess).
 */
export function resolveSlugId(slugOrId: string, type: StreamType = 'mixed'): string {
    const targetSlug = slugOrId.toLowerCase();

    // Helper to search a dictionary
    const searchDict = (dict: DictionaryType): string | null => {
        for (const [key, val] of Object.entries(dict)) {
            let currentSlug = '';
            if (typeof val === 'string') {
                // eslint-disable-next-line no-misleading-character-class
                const cleanText = val.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '').trim();
                currentSlug = slugify(cleanText);
            } else {
                currentSlug = val.slug;
            }

            if (currentSlug === targetSlug) {
                return key;
            }
        }
        return null;
    };

    // 1. Precise Lookup based on Type
    let matchedKey: string | null = null;

    if (type === 'category') {
        matchedKey = searchDict(categoryTranslations);
    } else if (type === 'tag') {
        matchedKey = searchDict(tagTranslations);
    } else {
        // Mixed Mode (Legacy)
        matchedKey = searchDict(categoryTranslations) ||
            searchDict(tagTranslations) ||
            searchDict(feedTranslations);
    }

    if (matchedKey) {
        // Found a match! Reconstruct strict ID format if we can infer type or know it.
        // If type is 'tag', OR it's mixed but found in tag dict, restore prefix.
        if (type === 'tag' || (type === 'mixed' && tagTranslations[matchedKey])) {
            return restoreLabelPrefix(matchedKey);
        }
        // If it's a category, we might also need prefix if the upstream ID has it (FreshRSS structure).
        // Categories usually act as labels too in FreshRSS ("user/-/label/...").
        // Let's assume Categories ALSO need prefix restoration if they are labels.
        if (type === 'category' || (type === 'mixed' && categoryTranslations[matchedKey])) {
            // CAUTION: Some categories might NOT be labels, but in our system they map to FreshRSS labels usually.

            // Fix: Restore Emoji if it exists in categoryEmojis
            // "engineering" -> matchedKey "工程实践"
            // FreshRSS ID: "user/-/label/📦 工程实践"
            // We need to re-attach the "📦 " prefix if categoryEmojis["工程实践"] exists.
            if (categoryEmojis[matchedKey]) {
                return restoreLabelPrefix(`${categoryEmojis[matchedKey]} ${matchedKey}`);
            }

            return restoreLabelPrefix(matchedKey);
        }

        return matchedKey;
    }

    // 2. Fallback: No match found.
    const decoded = decodeURIComponent(slugOrId);
    if (decoded.includes('user/')) return decoded;

    // If explicit type is tag, force prefix
    if (type === 'tag') {
        return `user/-/label/${decoded}`;
    }
    // If explicit type is category, force prefix (assuming categories are labels)
    if (type === 'category') {
        return `user/-/label/${decoded}`;
    }

    // Mixed mode fallback heuristic
    return `user/-/label/${decoded}`;
}
