import React, { memo } from 'react';

import StreamArticleListItem from './StreamListItem';
import EmptyState from '@/shared/ui/EmptyState';
import LoadMoreButton from '@/shared/ui/LoadMoreButton';

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
    return <EmptyState message="No articles found in this stream." />;
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
          <LoadMoreButton
            onClick={() => fetchNextPage?.()}
            isLoading={isFetchingNextPage || false}
          />
        </div>
      )}
    </div>
  );
};

export default memo(StreamList);
