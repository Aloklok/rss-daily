import React from 'react';
import { notFound } from 'next/navigation';
import { fetchBriefingData, fetchAvailableDates, getTodayInShanghai } from '../../lib/data';
import ArticleCard from '../../components/ArticleCard';
import BriefingClient from './BriefingClient';
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

    // Flatten articles for BriefingClient
    const allArticles = Object.values(groupedArticles).flat();

    // Check if empty
    const hasArticles = allArticles.length > 0;

    return (
        <BriefingClient
            articles={allArticles}
            date={date}
        />
    );
}
