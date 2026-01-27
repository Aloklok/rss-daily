import React, { memo, useMemo } from 'react';
import { Dictionary, zh } from '@/app/i18n/dictionaries';

const GRADIENTS = [
  'from-rose-100 via-rose-200 to-orange-100 dark:from-rose-900/40 dark:via-fuchsia-900/40 dark:to-indigo-900/40',
  'from-emerald-100 via-teal-200 to-cyan-100 dark:from-emerald-900/40 dark:via-teal-900/40 dark:to-cyan-900/40',
  'from-amber-100 via-orange-200 to-yellow-100 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-red-900/40',
  'from-sky-100 via-indigo-200 to-blue-100 dark:from-sky-900/40 dark:via-indigo-900/40 dark:to-blue-900/40',
  'from-fuchsia-100 via-purple-200 to-pink-100 dark:from-fuchsia-900/40 dark:via-purple-900/40 dark:to-pink-900/40',
];

interface ArticleListHeaderProps {
  title: string;
  count: number;
  description?: React.ReactNode;
  showCount?: boolean;
  dict?: Dictionary;
}

const ArticleListHeader: React.FC<ArticleListHeaderProps> = memo(
  ({ title, description, dict = zh }) => {
    // Generate deterministic gradient based on title char codes
    const randomGradient = useMemo(() => {
      if (!title) return GRADIENTS[0];
      const hash = title
        .split('')
        .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
      return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
    }, [title]);

    return (
      <header
        className={`relative mb-8 overflow-hidden rounded-2xl bg-linear-to-br ${randomGradient} shadow-xs`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[url('/paper-texture.png')] opacity-30 mix-blend-overlay"></div>
        <div className="relative px-6 py-6 md:px-10 md:py-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900 drop-shadow-xs md:text-4xl dark:text-white">
            {title}
          </h1>



          {description && (
            <div className="mt-6 border-t border-black/5 pt-4 text-sm dark:border-white/10">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="shrink-0 font-bold text-gray-900 dark:text-white">{dict.stream.related}:</span>
                <div className="leading-relaxed font-medium text-gray-700 opacity-90 dark:text-gray-200">
                  {description}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  },
);

ArticleListHeader.displayName = 'ArticleListHeader';

export default ArticleListHeader;
