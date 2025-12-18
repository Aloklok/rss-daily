'use client';

import { useArticleMetadata } from '../../../hooks/useArticleMetadata';
import { Article } from '../../../types';

export default function ArticleTitleStar({
  article,
  className = 'w-6 h-6 mr-2',
}: {
  article: Article;
  className?: string;
}) {
  const { isStarred } = useArticleMetadata(article);

  // Use a mounted check to avoid hydration mismatch if needed,
  // but usually useArticleMetadata should be consistent if store is hydrated.
  // For now, we assume it's fine or we accept a small flicker.

  if (!isStarred) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`text-amber-400 ${className}`}
      style={{ shapeRendering: 'geometricPrecision' }}
    >
      <title>已收藏</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}
