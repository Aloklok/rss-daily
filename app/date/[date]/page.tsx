import React from 'react';
import { notFound } from 'next/navigation';
import { fetchBriefingData, fetchAvailableDates, getTodayInShanghai } from '../../lib/data';
import ArticleCard from '../../components/ArticleCard';
import { unstable_noStore as noStore } from 'next/cache';

// Revalidate every hour for past dates (ISR).
// For "Today", we will use noStore() to opt out of caching.
export const revalidate = 604800;

export async function generateStaticParams() {
    const dates = await fetchAvailableDates();
    const today = getTodayInShanghai();

    // Exclude today from static generation to ensure it's always treated as dynamic (SSR) initially
    // and to avoid building a stale version at build time.
    return dates
        .filter(date => date !== today)
        .map((date) => ({
            date: date,
        }));
}

export default async function BriefingPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
    const today = getTodayInShanghai();

    // If it's today, opt out of caching to ensure real-time updates (SSR)
    if (date === today) {
        noStore();
    }

    const groupedArticles = await fetchBriefingData(date);

    // Check if empty
    const hasArticles = Object.values(groupedArticles).some(arr => arr.length > 0);
    if (!hasArticles) {
        // If it's a valid date format but no data, maybe show empty state or 404?
        // For now, render empty state.
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8 text-center">
                {new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} 简报
            </h1>

            {Object.entries(groupedArticles).map(([section, articles]) => {
                if (articles.length === 0) return null;
                return (
                    <section key={section} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center">
                            <span className="mr-2">
                                {section === '重要新闻' ? '🔥' : section === '必知要闻' ? '⚡️' : '📰'}
                            </span>
                            {section}
                        </h2>
                        <div className="space-y-8">
                            {articles.map(article => (
                                <ArticleCard key={article.id} article={article} />
                            ))}
                        </div>
                    </section>
                );
            })}

            {!hasArticles && (
                <div className="text-center text-gray-500 py-12">
                    暂无该日期的简报数据。
                </div>
            )}
        </div>
    );
}
