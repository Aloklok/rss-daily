import Link from 'next/link';
import Image from 'next/image';
import { getSlugLink } from '@/domains/reading/utils/slug-helper';
import { AvailableFilters } from '@/shared/types';
import { Dictionary } from '@/app/i18n/dictionaries';

interface SidebarNavServerProps {
  initialDates: string[];
  initialAvailableFilters: AvailableFilters;
  dict: Dictionary;
}

export default function SidebarNavServer({
  initialDates,
  initialAvailableFilters,
  dict,
}: SidebarNavServerProps) {
  const dates = initialDates.slice(0, 30);
  const categories = (initialAvailableFilters.categories || []).filter((c) => c.label !== '未分类');
  const tags = initialAvailableFilters.tags || [];

  return (
    <aside className="dark:bg-midnight-sidebar dark:border-midnight-border relative flex h-full w-full shrink-0 flex-col space-y-2 border-r border-gray-200 bg-gray-50 px-4 pt-4 pb-2 md:w-80">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Image
            src="/computer_cat_180.jpeg"
            alt="Logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover shadow-xs"
            priority
          />
          <div className="bg-linear-to-r from-indigo-500 via-pink-500 via-purple-500 to-orange-500 bg-clip-text text-xl leading-tight font-bold tracking-tight text-transparent">
            RSS Briefing
            <br />
            Hub
          </div>
        </div>
        <Link
          href={dict.lang === 'zh' ? '/archive' : '/en/archive'}
          className="dark:hover:bg-midnight-card flex cursor-pointer items-center justify-center rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400"
          title={dict.archive.title}
          aria-label={dict.archive.title}
          prefetch={false}
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="sr-only">Archive</span>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col">
          <div className="mb-1 flex w-full items-center gap-2 px-2 py-1 text-left text-base font-bold text-gray-600 dark:text-gray-300">
            <span>📅 {dict.briefing.header.dailyUpdates}</span>
          </div>
          <div className="ml-1 space-y-1">
            {dates.map((date) => (
              <Link
                key={date}
                href={dict.lang === 'zh' ? `/date/${date}` : `/en/date/${date}`}
                prefetch={false}
                className="dark:hover:bg-midnight-card block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200"
              >
                {date}
              </Link>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col">
            <div className="mb-1 flex w-full items-center gap-2 px-2 py-1 text-left text-base font-bold text-gray-600 dark:text-gray-300">
              <span>🗂️ {dict.archive.filters.categories}</span>
            </div>
            <div className="ml-1 space-y-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={getSlugLink(c.id, dict.lang as 'zh' | 'en')}
                  prefetch={false}
                  className="dark:hover:bg-midnight-card flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200"
                >
                  <span className="truncate">{c.label}</span>
                  {c.count !== undefined && c.count > 0 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-black/20 dark:text-gray-500">
                      {c.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-col">
            <div className="mb-1 flex w-full items-center gap-2 px-2 py-1 text-left text-base font-bold text-gray-600 dark:text-gray-300">
              <span>🏷️ {dict.archive.filters.tags}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 px-1">
              {tags.slice(0, 20).map((t) => (
                <Link
                  key={t.id}
                  href={getSlugLink(t.id, dict.lang as 'zh' | 'en', 'tag')}
                  prefetch={false}
                  className="dark:hover:bg-midnight-card flex w-full items-center justify-between rounded-md border border-transparent px-2.5 py-1.5 text-left text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <span className="truncate">#{t.label}</span>
                  {t.count !== undefined && t.count > 0 && (
                    <span className="text-xs opacity-60">{t.count}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="px-1">
          <Link
            href={dict.lang === 'zh' ? '/sources' : '/en/sources'}
            prefetch={false}
            className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:shadow-md active:scale-95 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 11.25h4.5m-4.5 2.25h4.5m2.121 1.767c1.208.11 2.412.214 3.621.32a.75.75 0 00.879-.75V18a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 18v.887c0 .436.353.793.79.75 1.21-.106 2.417-.21 3.626-.32m6.704-12.347l-3.457-3.457A1.125 1.125 0 0011.25 3H8.25A2.25 2.25 0 006 5.25v13.5A2.25 2.25 0 008.25 21h7.5A2.25 2.25 0 0018 18.75V8.25a1.125 1.125 0 00-.33-.795z"
                />
              </svg>
            </span>
            <span>{dict.nav.sources}</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
