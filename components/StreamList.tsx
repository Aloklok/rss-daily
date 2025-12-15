import React, { memo } from 'react';

import StreamArticleListItem from './StreamArticleListItem';

interface StreamListProps {
    articleIds: (string | number)[];
    isLoading: boolean;
    fetchNextPage?: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
}

const StreamList: React.FC<StreamListProps> = ({
    articleIds,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
}) => {
    if (isLoading) return <div className="py-20 text-center">Loading...</div>;

    if (articleIds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-400">
                <div className="text-6xl mb-4 grayscale">📭</div>
                <p className="font-serif text-xl">No articles found in this stream.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-8">
            {/* Single Column Layout (Stream View) */}
            <div className="flex flex-col gap-4">
                {articleIds.map((id) => (
                    <StreamArticleListItem key={id} articleId={id} />
                ))}
            </div>

            {hasNextPage && (
                <div className="mt-12 text-center">
                    <button
                        onClick={() => fetchNextPage?.()}
                        disabled={isFetchingNextPage}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-full font-medium hover:bg-stone-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {isFetchingNextPage ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(StreamList);
