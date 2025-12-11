import React, { memo, useMemo } from 'react';

const GRADIENTS = [
    'from-rose-100 via-rose-200 to-orange-100 dark:from-rose-900/40 dark:via-fuchsia-900/40 dark:to-indigo-900/40',
    'from-emerald-100 via-teal-200 to-cyan-100 dark:from-emerald-900/40 dark:via-teal-900/40 dark:to-cyan-900/40',
    'from-amber-100 via-orange-200 to-yellow-100 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-red-900/40',
    'from-sky-100 via-indigo-200 to-blue-100 dark:from-sky-900/40 dark:via-indigo-900/40 dark:to-blue-900/40',
    'from-fuchsia-100 via-purple-200 to-pink-100 dark:from-fuchsia-900/40 dark:via-purple-900/40 dark:to-pink-900/40'
];

interface ArticleListHeaderProps {
    title: string;
    count: number;
    description?: React.ReactNode;
    showCount?: boolean;
}

const ArticleListHeader: React.FC<ArticleListHeaderProps> = memo(({ title, count, description, showCount = true }) => {
    // Generate deterministic gradient based on title char codes
    const randomGradient = useMemo(() => {
        if (!title) return GRADIENTS[0];
        const hash = title.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
    }, [title]);

    return (
        <header className={`relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br ${randomGradient} shadow-sm`}>
            <div className="absolute inset-0 bg-[url('/paper-texture.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
            <div className="relative px-6 py-6 md:px-10 md:py-8">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                    {title}
                </h1>

                {showCount && (
                    <div className="mt-3 flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium opacity-80">
                        <span className="uppercase tracking-widest text-xs">Collection</span>
                        <span className="w-8 h-px bg-current opacity-50"></span>
                        <span className="text-sm">{count} Articles</span>
                    </div>
                )}

                {description && (
                    <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/10 text-sm">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-bold text-gray-900 dark:text-white shrink-0">Related:</span>
                            <div className="text-gray-700 dark:text-gray-200 leading-relaxed font-medium opacity-90">
                                {description}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
});

ArticleListHeader.displayName = 'ArticleListHeader';

export default ArticleListHeader;
