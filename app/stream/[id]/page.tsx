import React from 'react';
import { fetchFilteredArticles } from '@/services/articleLoader';
import StreamList from '@/app/components/StreamList';

// Helper to extract top keywords from a list of articles
function getTopKeywords(articles: any[], limit = 10): string[] {
    const frequency: Record<string, number> = {};
    articles.forEach(article => {
        if (Array.isArray(article.keywords)) {
            article.keywords.forEach((k: string) => {
                // Normalize: lowercase and trim
                const cleanKey = k.trim();
                if (cleanKey) {
                    frequency[cleanKey] = (frequency[cleanKey] || 0) + 1;
                }
            });
        }
    });

    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a) // Sort by descending frequency
        .slice(0, limit)
        .map(([key]) => key);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const tagName = decodedId.split('/').pop() || decodedId;

    // Fetch data for metadata generation (SSR cache will help avoid double hit if configured, 
    // but here we might hit API twice. Given 1hr cache control on FreshRSS, it's acceptable for SEO value).
    // Note: In an ideal world we'd use a shared fetch cache, but simplistic approach works for now.
    const { articles } = await fetchFilteredArticles(decodedId, undefined, 20, true);
    const topKeywords = getTopKeywords(articles, 8);

    return {
        title: `${tagName} - AI Insights & Briefings`,
        description: `Explore AI-curated insights for ${tagName}, covering topics like ${topKeywords.join(', ')}. Daily updates, market takes, and critical analysis.`,
        keywords: topKeywords,
    };
}

export default async function StreamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const tagName = decodedId.split('/').pop() || decodedId;

    const { articles, continuation } = await fetchFilteredArticles(decodedId, undefined, 20, true);

    // Extract keywords for UI
    const relatedTopics = getTopKeywords(articles, 12);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold break-words flex items-center gap-3 mb-3">
                    <span className="text-indigo-600">#</span>
                    {tagName}
                    <span className="text-lg font-normal text-gray-500 ml-2">Topic Hub</span>
                </h1>

                {/* Related Topics Cloud */}
                {relatedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-1">Related:</span>
                        {relatedTopics.map(topic => (
                            <span
                                key={topic}
                                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-midnight-card dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <StreamList
                filterValue={decodedId}
                initialArticles={articles}
                initialContinuation={continuation}
            />
        </div>
    );
}
