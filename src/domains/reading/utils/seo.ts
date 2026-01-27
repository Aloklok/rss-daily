import { Article } from '@/types';

// Helper to extract top keywords with diversity (Round Robin)
export function getTopKeywords(articles: Article[], limit = 10): string[] {
    const frequency: Record<string, number> = {};
    const articleKeywordsMap: Record<number, string[]> = {};

    // 1. Calculate Frequency and build map
    articles.forEach((article, index) => {
        if (Array.isArray(article.keywords)) {
            const kws: string[] = [];
            article.keywords.forEach((k: string) => {
                const cleanKey = k.trim();
                // Exclude common but generic terms if needed
                if (cleanKey && cleanKey.length > 1) {
                    frequency[cleanKey] = (frequency[cleanKey] || 0) + 1;
                    kws.push(cleanKey);
                }
            });
            articleKeywordsMap[index] = kws;
        }
    });

    // 2. Separate High Frequency (>1) Keywords
    const allUniqueKeywords = Object.keys(frequency);
    const highFreqKeywords = allUniqueKeywords
        .filter((k) => frequency[k] > 1)
        .sort((a, b) => frequency[b] - frequency[a]);

    // 3. Round-Robin Selection for Diversity
    const selectedKeywords = new Set<string>();

    // Add high frequency keywords first
    for (const k of highFreqKeywords) {
        if (selectedKeywords.size >= limit) break;
        selectedKeywords.add(k);
    }

    // Fill remaining slots using Round-Robin across articles
    let round = 0;
    let addedInRound = true;

    // Continue until limit reached or no more keywords can be added
    while (selectedKeywords.size < limit && addedInRound) {
        addedInRound = false;
        for (let i = 0; i < articles.length; i++) {
            if (selectedKeywords.size >= limit) break;

            const kws = articleKeywordsMap[i] || [];
            // Find the first keyword in this article that hasn't been used yet
            if (round < kws.length) {
                const candidate = kws[round];
                if (candidate && !selectedKeywords.has(candidate)) {
                    selectedKeywords.add(candidate);
                    addedInRound = true;
                }
            } else {
                const unused = kws.find((k) => !selectedKeywords.has(k));
                if (unused) {
                    selectedKeywords.add(unused);
                    addedInRound = true;
                }
            }
        }
        round++;
    }

    return Array.from(selectedKeywords);
}

const PRIORITY_MAP: Record<string, number> = {
    重要新闻: 3,
    必知要闻: 2,
    常规更新: 1,
    'Important News': 3,
    'Must Know': 2,
    'Regular Updates': 1,
};

export function getSortedArticles(articles: Article[]) {
    return [...articles].sort((a, b) => {
        // Handle both string section and verdict importance
        const sectionA = a.briefingSection || a.verdict?.importance || '常规更新';
        const sectionB = b.briefingSection || b.verdict?.importance || '常规更新';

        const pA = PRIORITY_MAP[sectionA] || 1;
        const pB = PRIORITY_MAP[sectionB] || 1;

        if (pA !== pB) return pB - pA; // Higher priority first
        return (b.verdict?.score || 0) - (a.verdict?.score || 0); // Higher score first within priority
    });
}

/**
 * Generate High Density Description for SEO
 * @param date YYYY-MM-DD
 * @param allArticles List of articles
 * @param lang 'zh' | 'en'
 */
export function generateHighDensityDescription(date: string, allArticles: Article[], lang: 'zh' | 'en' = 'zh') {
    if (lang === 'en') {
        if (allArticles.length === 0) return `${date} Daily Briefing. Aggregated Tech News & RSS Highlights.`;

        const sortedArticles = getSortedArticles(allArticles);
        // Top 3 Headlines
        const top3Titles = sortedArticles.slice(0, 3).map((a) => {
            const text = a.tldr || a.title;
            return text.replace(/\|/g, '-').replace(/[.,;!]+$/, '').trim();
        });

        let desc = `${date} Briefing: ${top3Titles.join(' | ')}. `;
        if (allArticles.length > 3) {
            desc += `Plus ${allArticles.length - 3} more curated tech updates.`;
        } else {
            desc += `Curated tech updates.`;
        }
        return desc;
    }

    // Chinese Logic (Default)
    if (allArticles.length === 0) return `${date} 每日简报。汇聚科技新闻与 RSS 订阅精华。`;

    const sortedArticles = getSortedArticles(allArticles);

    // Top 3 Headlines (Using TLDR if available, else Title)
    const top3Titles = sortedArticles.slice(0, 3).map((a) => {
        const text = a.tldr || a.title;
        return text
            .replace(/\|/g, '-')
            .replace(/[。，.,;；!！\s]+$/, '')
            .trim();
    });

    // Keywords
    const topKeywords = getTopKeywords(allArticles, 10).slice(0, 5);

    let desc = `${date} 简报：${top3Titles.join(' | ')} `;

    if (allArticles.length > 3) {
        desc += `。涵盖${topKeywords.join('、')}等${allArticles.length} 条技术精选。`;
    } else {
        desc += `。今日${allArticles.length} 条更新。`;
    }

    return desc;
}
