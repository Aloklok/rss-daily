import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { fetchAvailableDates } from '@/lib/server/dataFetcher';

export const metadata: Metadata = {
  title: '内容归档 | 历史简报列表',
  description: '查看所有历史发布的 AI 全栈架构技术简报。按日期索引，方便快速查阅历史内容。',
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

export default async function ArchivePage(): Promise<JSX.Element> {
  const dates = await fetchAvailableDates();
  const grouped = groupDates(dates);
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold text-stone-900 dark:text-stone-100">
          内容归档
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-400">
          索引所有历史简报数据 ({dates.length} 篇)
        </p>
      </div>

      <div className="space-y-12">
        {months.map((month) => {
          const [year, m] = month.split('-');
          const displayMonth = new Date(parseInt(year), parseInt(m) - 1).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
          });

          return (
            <section key={month} className="relative">
              <div className="mb-6 py-2">
                <h2 className="font-serif text-2xl font-bold text-stone-800 dark:text-stone-200">
                  {displayMonth}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {grouped[month].map((date) => {
                  const day = date.split('-')[2];
                  return (
                    <Link
                      key={date}
                      href={`/date/${date}`}
                      className="group flex flex-col items-center justify-center rounded-xl border border-stone-100 bg-stone-50/50 p-4 transition-all hover:bg-white hover:shadow-md hover:ring-1 hover:ring-indigo-500/30 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:bg-stone-800"
                    >
                      <span className="text-2xl font-bold text-stone-700 dark:text-stone-300">
                        {day}
                      </span>
                      <span className="text-xs text-stone-400 group-hover:text-indigo-500">
                        {date}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-20 border-t border-stone-100 pt-8 text-center text-sm text-stone-400 dark:border-stone-800">
        <p>© {new Date().getFullYear()} RSS Briefing Hub Archive</p>
      </div>
    </main>
  );
}
