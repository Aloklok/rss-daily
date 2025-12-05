'use client';

import { useArticleMetadata } from '../../hooks/useArticleMetadata';
import { Article } from '../../types';

export default function ArticleTitleStar({ article }: { article: Article }) {
    const { isStarred } = useArticleMetadata(article);

    // Use a mounted check to avoid hydration mismatch if needed, 
    // but usually useArticleMetadata should be consistent if store is hydrated.
    // For now, we assume it's fine or we accept a small flicker.

    if (!isStarred) return null;
    return <span className="text-amber-400 text-2xl mr-2" title="已收藏">⭐️</span>;
}
