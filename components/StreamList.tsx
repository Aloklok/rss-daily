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
  isFetchingNextPage,
}) => {
  if (isLoading) return <div className="py-20 text-center">Loading...</div>;

  if (articleIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-stone-400">
        <div className="mb-4 text-6xl grayscale">📭</div>
        <p className="font-serif text-xl">No articles found in this stream.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
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
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 font-medium transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(StreamList);
