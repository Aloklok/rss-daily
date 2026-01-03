import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  fetchAvailableDates,
  getAvailableFilters,
  fetchSubscriptions,
} from '@/lib/server/dataFetcher';
import { CATEGORY_ORDER, UNCATEGORIZED_LABEL } from '@/lib/constants';

export const metadata: Metadata = {
  title: '内容归档 | 历史简报列表',
  description: '查看所有历史发布的全栈架构技术简报。按日期索引，方便快速查阅历史内容。',
  robots: {
    index: true,
    follow: true,
  },
};

// Simple grouping by Month/Year
function groupDates(dates: string[]) {
  const groups: Record<string, string[]> = {};
  dates.forEach((date) => {
    const month = date.substring(0, 7); // YYYY-MM
    if (!groups[month]) groups[month] = [];
    groups[month].push(date);
  });
  return groups;
}

export default async function ArchivePage() {
  const [dates, filters, subscriptions] = await Promise.all([
    fetchAvailableDates(),
    getAvailableFilters(),
    fetchSubscriptions(),
  ]);

  const grouped = groupDates(dates);
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const getOrderIndex = (name: string) => {
    const cleanName = (name || '').trim().toLowerCase();
    return CATEGORY_ORDER.findIndex((keyword) => cleanName.includes(keyword.toLowerCase()));
  };

  const allCategories = (filters.categories || [])
    .filter(
      (cat) => cat.label !== UNCATEGORIZED_LABEL && cat.label.toLowerCase() !== 'uncategorized',
    )
    .sort((a, b) => (b.count || 0) - (a.count || 0)); // Keep count sort for tags list

  const topTags = (filters.tags || []).slice(0, 20);

  // Show ALL Sources, grouped by category for better organization
  const groupedSources: Record<string, typeof subscriptions> = {};
  (subscriptions || []).forEach((sub) => {
    const cat = sub.category || UNCATEGORIZED_LABEL;
    if (!groupedSources[cat]) groupedSources[cat] = [];
    groupedSources[cat].push(sub);
  });

  const sortedSourceCategories = Object.keys(groupedSources)
    .filter((cat) => cat !== UNCATEGORIZED_LABEL && cat.toLowerCase() !== 'uncategorized')
    .sort((a, b) => {
      const indexA = getOrderIndex(a);
      const indexB = getOrderIndex(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b, 'zh-Hans-CN');
    });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold text-stone-900 dark:text-stone-900">
          内容归档
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-400">
          索引所有历史简报数据 ({dates.length} 篇)
        </p>
      </div>

      <div className="space-y-16">
        {/* Dates Grid */}
        <section>
          <div className="mb-8 border-b border-stone-100 pb-2 dark:border-stone-800">
            <h2 className="font-serif text-2xl font-bold text-stone-800 dark:text-stone-800">
              按日期浏览
            </h2>
          </div>
          <div className="space-y-10">
            {months.map((month) => {
              const [year, m] = month.split('-');
              const displayMonth = new Date(parseInt(year), parseInt(m) - 1).toLocaleString(
                'zh-CN',
                {
                  year: 'numeric',
                  month: 'long',
                },
              );

              return (
                <div key={month} className="relative">
                  <h3 className="mb-4 text-lg font-medium text-stone-500">{displayMonth}</h3>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12">
                    {grouped[month]
                      .sort((a, b) => a.localeCompare(b))
                      .map((date) => {
                        const day = date.split('-')[2];
                        return (
                          <Link
                            key={date}
                            href={`/date/${date}`}
                            className="group flex aspect-square flex-col items-center justify-center rounded-lg border border-stone-100 bg-stone-50/50 p-1 transition-all hover:bg-white hover:shadow-md hover:ring-1 hover:ring-indigo-500/30 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:bg-stone-800"
                          >
                            <span className="text-lg font-bold text-stone-700 dark:text-stone-300">
                              {day}
                            </span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SEO - Discover Topics Section */}
        <section className="rounded-2xl bg-stone-50/50 p-8 dark:bg-stone-900/30">
          <div className="mb-10">
            <h2 className="font-serif text-2xl font-bold text-stone-800 dark:text-stone-800">
              探索主题领域
            </h2>
            <p className="mt-2 text-sm text-stone-500">按技术分类或核心关键词检索聚合内容</p>
          </div>

          <div className="space-y-12">
            {/* Categories */}
            <div>
              <h3 className="mb-4 text-xs font-bold tracking-widest text-stone-400 uppercase">
                技术领域全景
              </h3>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/stream/${encodeURIComponent(cat.id)}`}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                  >
                    {cat.label}
                    <span className="ml-1.5 text-xs text-stone-300">{cat.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Structured Sources Groups */}
            <div className="space-y-8">
              <h3 className="text-xs font-bold tracking-widest text-stone-400 uppercase">
                关注订阅来源
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {sortedSourceCategories.map((catName) => (
                  <div key={catName} className="space-y-3">
                    <h4 className="text-sm font-bold tracking-tight text-stone-500 uppercase">
                      {catName}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedSources[catName].map((source) => (
                        <Link
                          key={source.id}
                          href={`/sources?source=${encodeURIComponent(source.id)}`}
                          className="rounded-md border border-stone-100 bg-stone-100/30 px-2 py-0.5 text-xs font-medium text-stone-500 transition-all hover:border-stone-300 hover:bg-white hover:text-stone-900 dark:border-stone-800 dark:bg-stone-800/50 dark:hover:border-stone-700 dark:hover:text-stone-300"
                        >
                          {source.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="mb-4 text-xs font-bold tracking-widest text-stone-400 uppercase">
                核心标签
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/stream/${encodeURIComponent(tag.id)}`}
                    className="rounded-md px-2 py-0.5 text-xs font-medium text-stone-400 transition-all hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                  >
                    # {tag.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-20 border-t border-stone-100 pt-8 text-center text-sm text-stone-400 dark:border-stone-800">
        <p>© {new Date().getFullYear()} RSS Briefing Hub Archive</p>
      </div>
    </main>
  );
}
