import { Metadata } from 'next';
import Link from 'next/link';
import {
  fetchAvailableDates,
  fetchAvailableDatesEn,
  getAvailableFilters,
  fetchSubscriptions,
} from '@/domains/reading/services';
import { CATEGORY_ORDER, UNCATEGORIZED_LABEL } from '@/domains/reading/constants';
import { en, zh } from '@/app/i18n/dictionaries';
import { getDisplayLabel } from '@/domains/reading/utils/label-display';
import { getSlugLink } from '@/domains/reading/utils/slug-helper';

type Lang = 'zh' | 'en';

interface PageProps {
  lang: Lang;
}

// Helper to get dictionary based on lang
const getDict = (lang: Lang) => (lang === 'en' ? en : zh);

export async function generateArchiveMetadata({ lang }: PageProps): Promise<Metadata> {
  const dict = getDict(lang);
  return {
    title: dict.archive.metaTitle,
    description: dict.archive.metaDescription,
    alternates: {
      canonical:
        lang === 'en' ? `https://www.alok-rss.top/en/archive` : `https://www.alok-rss.top/archive`,
      languages: {
        zh: 'https://www.alok-rss.top/archive',
        en: 'https://www.alok-rss.top/en/archive',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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

export async function ArchivePage({ lang }: PageProps) {
  const dict = getDict(lang);
  const [dates, filtersRaw, subscriptionsRaw] = await Promise.all([
    lang === 'en' ? fetchAvailableDatesEn() : fetchAvailableDates(),
    getAvailableFilters(),
    fetchSubscriptions(),
  ]);

  const { purifySubscriptions } = await import('@/domains/reading/utils/label-display');
  const filters =
    lang === 'en'
      ? {
          categories: (filtersRaw.categories || []).map((c) => ({
            ...c,
            label: getDisplayLabel(c.label, 'category', 'en'),
          })),
          tags: (filtersRaw.tags || []).map((t) => ({
            ...t,
            label: getDisplayLabel(t.label, 'tag', 'en'),
          })),
        }
      : filtersRaw;
  const subscriptions =
    lang === 'en' ? purifySubscriptions(subscriptionsRaw, 'en') : subscriptionsRaw;

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
      return a.localeCompare(b, lang === 'zh' ? 'zh-Hans-CN' : 'en-US');
    });

  const dateLinkPrefix = lang === 'en' ? '/en/date' : '/date';
  // Note: Stream/Source links currently point to root (Chinese) as localized pages for them don't exist yet.
  // We can prefix them /en/stream if we plan to create them, but for now fallback to default or keep relative if we add rewrite rules?
  // Let's assume /en/stream doesn't exist. So we use root paths.
  // OR we use /en/stream and let it 404 until implemented?
  // Better: Point to /stream (which is Chinese UI) but it's better than 404.
  // Actually, if I create /en/archive, users expect links to work.
  // Let's prefix only date links for now.
  const resourceLinkPrefix = lang === 'en' ? '/en' : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: dict.archive.title,
    description: dict.archive.metaDescription,
    url: lang === 'en' ? 'https://www.alok-rss.top/en/archive' : 'https://www.alok-rss.top/archive',
    inLanguage: lang === 'en' ? 'en-US' : 'zh-CN',
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold text-stone-900 dark:text-stone-900">
          {dict.archive.title}
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-400">
          {dict.archive.subtitle.replace('{count}', dates.length.toString())}
        </p>
      </div>

      <div className="space-y-16">
        {/* Dates Grid */}
        <section>
          <div className="mb-8 border-b border-stone-100 pb-2 dark:border-stone-800">
            <h2 className="font-serif text-2xl font-bold text-stone-800 dark:text-stone-800">
              {dict.archive.browseByDate}
            </h2>
          </div>
          <div className="space-y-10">
            {months.map((month) => {
              const [year, m] = month.split('-');
              const displayMonth = new Date(parseInt(year), parseInt(m) - 1).toLocaleString(
                lang === 'zh' ? 'zh-CN' : 'en-US',
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
                            prefetch={false}
                            key={date}
                            href={`${dateLinkPrefix}/${date}`}
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
              {dict.archive.exploreTopics}
            </h2>
            <p className="mt-2 text-sm text-stone-500">{dict.archive.exploreSubtitle}</p>
          </div>

          <div className="space-y-12">
            {/* Categories */}
            <div>
              <h3 className="mb-4 text-xs font-bold tracking-widest text-stone-400 uppercase">
                {dict.archive.domainPanorama}
              </h3>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <Link
                    prefetch={false}
                    key={cat.id}
                    href={getSlugLink(cat.id, lang, 'category')}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                  >
                    {getDisplayLabel(cat.label, 'category', lang)}
                    <span className="ml-1.5 text-xs text-stone-300">{cat.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Structured Sources Groups */}
            <div className="space-y-8">
              <h3 className="text-xs font-bold tracking-widest text-stone-400 uppercase">
                {dict.archive.subscriptions}
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {sortedSourceCategories.map((catName) => (
                  <div key={catName} className="space-y-3">
                    <h4 className="text-sm font-bold tracking-tight text-stone-500 uppercase">
                      {getDisplayLabel(catName, 'category', lang)}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedSources[catName].map((source) => (
                        <Link
                          prefetch={false}
                          key={source.id}
                          href={`${resourceLinkPrefix}/sources?source=${encodeURIComponent(source.id)}`}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-0.5 text-xs font-medium text-stone-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                        >
                          {getDisplayLabel(source.title, 'feed', lang)}
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
                {dict.archive.coreTags}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map((tag) => (
                  <Link
                    prefetch={false}
                    key={tag.id}
                    href={getSlugLink(tag.id, lang, 'tag')}
                    className="rounded-md px-2 py-0.5 text-xs font-medium text-stone-400 transition-all hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                  >
                    # {getDisplayLabel(tag.label, 'tag', lang)}
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
