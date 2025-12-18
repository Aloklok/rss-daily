'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ArticleDetail from './ArticlePage';
import { Article, CleanArticleContent } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';

interface ArticleDetailClientProps {
  article: Article;
  initialContent?: CleanArticleContent | null;
}

export default function ArticleDetailClient({
  article: initialArticle,
  initialContent,
}: ArticleDetailClientProps) {
  const router = useRouter();
  // Try to get the live article from the store to ensure we have the latest tags/state.
  // We use initialArticle during SSR/Hydration to ensure match, and switch to storedArticle after mount.
  const storedArticle = useArticleStore((state) => state.articlesById[initialArticle.id]);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const article = isMounted && storedArticle ? storedArticle : initialArticle;

  const handleClose = () => {
    // Navigate back to home or previous page
    router.push('/');
  };

  return <ArticleDetail article={article} onClose={handleClose} initialContent={initialContent} />;
}
