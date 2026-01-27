import { notFound } from 'next/navigation';
import { fetchFilteredArticlesSSR } from '@/app/lib/server/ssr-helpers';
import { getAvailableFilters } from '@/domains/reading/services';
import { logBotError } from '@/app/lib/server/log-bot-error'; // Correct import path
import ArticleListHeader from '@/domains/reading/components/stream/StreamHeader';
import StreamList from '@/domains/reading/components/stream/StreamContainer';
import { zh, en } from '@/app/i18n/dictionaries';
import { getTopKeywords } from '@/domains/reading/utils/seo';
import { getDisplayLabel } from '@/domains/reading/utils/label-display';
import { StreamType, resolveSlugId } from '@/domains/reading/utils/slug-helper';

type Lang = 'zh' | 'en';

interface PageProps {
    params: Promise<{ slug: string }>; // Changed from id to slug for clarity in new routes
    lang: Lang;
    type: StreamType;
}

export async function generateStreamMetadata({ params, lang, type }: PageProps) {
    const { slug } = await params;
    // Resolve Slug -> Raw ID (Safe Fallback)
    const decodedId = resolveSlugId(slug, type);
    const tagName = decodedId.split('/').pop() || decodedId;
    const tableName = lang === 'en' ? 'articles_view_en' : 'articles';

    // Fetch data for metadata

    // ...

    const { articles } = await fetchFilteredArticlesSSR(decodedId, 20, true, tableName);
    const topKeywords = getTopKeywords(articles, 8);
    const shouldIndex = articles && articles.length > 0;

    // Strict type check for display label
    const displayLabel = getDisplayLabel(tagName, type === 'category' ? 'category' : 'tag', lang);

    const title = lang === 'en'
        ? `${displayLabel} - AI Insights & Briefings`
        : `${displayLabel} - AI 智能简报与洞察`;

    const description = lang === 'en'
        ? `Explore AI-curated insights for ${displayLabel}, covering topics like ${topKeywords.join(', ')}. Daily updates, market takes, and critical analysis.`
        : `探索 ${displayLabel} 的 AI 精选洞察，涵盖 ${topKeywords.join('、')} 等主题。每日更新行业动态与深度分析。`;

    // Canonical structure update
    const typePath = type === 'category' ? 'category' : 'tag';
    const canonicalPath = lang === 'en' ? `/en/stream/${typePath}/${slug}` : `/stream/${typePath}/${slug}`;

    return {
        title,
        description,
        keywords: topKeywords,
        robots: {
            index: shouldIndex,
            follow: true,
        },
        alternates: {
            canonical: canonicalPath,
            languages: {
                'zh': `/stream/${typePath}/${slug}`,
                'en': `/en/stream/${typePath}/${slug}`,
            },
        },
    };
}

export async function StreamPage({ params, lang, type }: PageProps) {
    const { slug } = await params;
    // 1. Resolve Slug
    const decodedId = resolveSlugId(slug, type);
    const tagName = decodedId.split('/').pop() || decodedId;
    const tableName = lang === 'en' ? 'articles_view_en' : 'articles';
    const dict = lang === 'en' ? en : zh;

    let articlesData;
    let errorReason: string | undefined;

    try {
        const [res] = await Promise.all([
            fetchFilteredArticlesSSR(decodedId, 20, true, tableName),
            getAvailableFilters(),
        ]);
        articlesData = res;
    } catch (e: any) {
        console.error(`[StreamPage ${lang}] Service call failed for ${decodedId}:`, e);
        errorReason = `FreshRSS Exception: ${e.message || 'unknown'}`;
    }

    if (errorReason) {
        const typePath = type === 'category' ? 'category' : 'tag';
        const path = lang === 'en' ? `/en/stream/${typePath}/${slug}` : `/stream/${typePath}/${slug}`;
        await logBotError(path, errorReason);
        notFound();
    }

    const { articles, continuation } = articlesData!;
    // const { categories } = filtersData!; 
    // We already know key type from prop, but verification is fine.

    const relatedTopics = getTopKeywords(articles, 8);

    const displayLabel = getDisplayLabel(tagName, type === 'category' ? 'category' : 'tag', lang);

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <ArticleListHeader
                title={displayLabel}
                count={articles.length}
                showCount={type !== 'category'}
                description={relatedTopics.length > 0 ? relatedTopics.join(lang === 'en' ? ', ' : '、') : undefined}
                dict={dict}
            />

            <StreamList
                filterValue={decodedId}
                initialArticles={articles}
                initialContinuation={continuation}
                dict={dict}
                tableName={tableName}
                merge={true}
            />
        </div>
    );
}
