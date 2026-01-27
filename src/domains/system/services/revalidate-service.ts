import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { prewarmCache } from '@/shared/utils/server-prewarm';
import { generateEmbedding } from '@/domains/intelligence/services/embeddings';
import { translateAndSave } from '@/domains/intelligence/services/translate';
import { DEFAULT_TRANSLATION_MODEL } from '@/domains/intelligence/constants';

// Init Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory throttling cache
const lastRevalidated: Record<string, number> = {};
const REVALIDATE_THROTTLE_MS = 10000; // 10 seconds

export interface RevalidateOptions {
    lang: 'zh' | 'en';
    table: 'articles' | 'articles_en';
}

export type RevalidateResult =
    | { revalidated: boolean; date?: string; tag?: string; message?: string; fallback?: boolean }
    | { message: string };

export async function processRevalidation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
    options: RevalidateOptions
): Promise<RevalidateResult> {
    const { lang, table } = options;
    console.log(`[RevalidateService] Processing request for lang=${lang}, table=${table}`);

    try {
        const article = payload.record || payload;

        // 1. Auto-Embedding (ZH Only for now, per user request)
        // Ensure we write back to the correct table
        if (lang === 'zh' && !article.embedding) {
            const keywordsStr = Array.isArray(article.keywords) ? article.keywords.join(' ') : '';
            const contentToEmbed =
                `${article.title || ''} ${article.category || ''} ${keywordsStr} ${article.summary || ''} ${article.tldr || ''}`.trim();

            if (contentToEmbed.length > 10) {
                try {
                    console.log(`[RevalidateService] Auto-generating embedding for: ${article.title}`);
                    const embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT');
                    if (embedding) {
                        await supabase.from(table).update({ embedding }).eq('id', String(article.id));
                        console.log(`[RevalidateService] Successfully updated embedding for ${article.id} in ${table}`);
                    }
                } catch (embedError) {
                    console.error('[RevalidateService] Failed to auto-generate embedding:', embedError);
                }
            }
        }

        // 1.5. Auto-Translation (ZH -> EN)
        // If it's a ZH article and has AI content, trigger translation to articles_en
        if (lang === 'zh' && (article.summary || article.tldr)) {
            try {
                console.log(`[RevalidateService] Auto-triggering translation for: ${article.title}`);
                const translationResult = await translateAndSave({
                    id: String(article.id),
                    title: article.title || '',
                    category: article.category || '',
                    summary: article.summary || '',
                    tldr: article.tldr || '',
                    highlights: article.highlights || '',
                    critiques: article.critiques || '',
                    marketTake: article.marketTake || '',
                    keywords: Array.isArray(article.keywords) ? article.keywords : [],
                    link: article.link,
                    sourceName: article.sourceName,
                    published: article.published,
                    n8n_processing_date: article.n8n_processing_date,
                    verdict: article.verdict,
                }, DEFAULT_TRANSLATION_MODEL);

                if (translationResult.success) {
                    console.log(`[RevalidateService] Successfully translated article ${article.id}`);
                } else {
                    console.warn(`[RevalidateService] Translation failed for ${article.id}:`, translationResult.error);
                }
            } catch (transError) {
                console.error('[RevalidateService] Error during auto-translation:', transError);
            }
        }

        // 2. Date Extraction
        let dateStr = article.n8n_processing_date || article.published;

        // [Lean Architecture Fixed] For EN articles, the date is now only in the main table.
        // If the webhook payload is missing the date, we fetch it from the prime source.
        if (!dateStr && lang === 'en' && article.id) {
            console.log(`[RevalidateService] Missing date for EN article ${article.id}, fetching from main table...`);
            const { data } = await supabase.from('articles').select('n8n_processing_date, published').eq('id', String(article.id)).single();
            if (data) {
                dateStr = data.n8n_processing_date || data.published;
            }
        }

        if (dateStr) {
            const date = dateStr.split('T')[0]; // Extract YYYY-MM-DD (Shanghai/UTC ISO part)

            // 3. Throttling
            // We use a composite key for throttling to avoid collision if both languages update same date same time (unlikely but safe)
            const throttleKey = `${lang}:${date}`;
            const now = Date.now();

            if (lastRevalidated[throttleKey] && now - lastRevalidated[throttleKey] < REVALIDATE_THROTTLE_MS) {
                console.log(
                    `[RevalidateService] Throttling: Skipping revalidate for ${throttleKey} (last one was < 10s ago)`,
                );
                return { message: 'Throttled', date };
            }
            lastRevalidated[throttleKey] = now;

            // 4. Execution (Cache Invalidation)
            console.log(`[RevalidateService] Executing invalidation for ${lang}/${date}`);

            // Path Construction
            const datePath = lang === 'en' ? `/en/date/${date}` : `/date/${date}`;
            const homePath = lang === 'en' ? `/en` : `/`;

            // Tag Construction
            // ZH: 'briefing-data-${date}'
            // EN: 'briefing-data-${date}-en'
            const specificTag = lang === 'en' ? `briefing-data-${date}-en` : `briefing-data-${date}`;
            const globalTag = lang === 'en' ? 'briefing-data-en' : 'briefing-data';

            revalidateTag(specificTag, 'max');
            // Also invalidate global tag if needed, though EN usage check suggests it might only use date-specific.
            // But invalidating global doesn't hurt.
            revalidateTag(globalTag, 'max');

            revalidatePath(datePath);

            // Invalidate Sidebar Dates
            // ZH: 'available-dates'
            // EN: 'available-dates-en'
            const datesTag = lang === 'en' ? 'available-dates-en' : 'available-dates';
            revalidateTag(datesTag, 'max');

            // Homepage (if today)
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
            if (date === today) {
                revalidatePath(homePath);
            }

            // Pre-warm
            // We need to pass the full URL or just the date?
            // server-prewarm uses `headers().get('host')`.
            // It constructs `${baseUrl}/date/${date}`.
            // We need to teach prewarmCache about /en/ prefix?
            // server-prewarm.ts currently hardcodes `/date/${date}`.
            // We might need to upgrade prewarmCache too or just pass a flag.
            // For now, let's call it differently or update it.
            // Let's import prewarmCache and see if we can trick it or if we need to update it.
            // Update prewarmCache to accept 'lang'? 
            // Let's keep it simple: The current prewarmCache hardcodes path. 
            // Phase 4 implies fixing this. I should update prewarmCache too.

            // Calling prewarm (Optimistic, assuming I fix it later or it's just one-line fix)
            // I'll update prewarmCache in next step.
            await prewarmCache(date, lang);

            return { revalidated: true, date };
        }

        // Fallback
        const globalTagFallback = lang === 'en' ? 'briefing-data-en' : 'briefing-data';
        const datesTagFallback = lang === 'en' ? 'available-dates-en' : 'available-dates';

        revalidateTag(globalTagFallback, 'max');
        revalidateTag(datesTagFallback, 'max');
        return { revalidated: true, fallback: true };

    } catch (error: any) {
        console.warn('[RevalidateService] Error processing payload:', error);
        // Safe Fallback
        const globalTagFallback = lang === 'en' ? 'briefing-data-en' : 'briefing-data';
        const datesTagFallback = lang === 'en' ? 'available-dates-en' : 'available-dates';

        revalidateTag(globalTagFallback, 'max');
        revalidateTag(datesTagFallback, 'max');
        return { revalidated: true, fallback: true, message: error.message };
    }
}
