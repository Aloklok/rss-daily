'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ArticleDetail from '../../components/ArticleDetail';
import { Article, CleanArticleContent } from '../../types';
import { useArticleStore } from '../../store/articleStore';

interface ArticleDetailClientProps {
  article: Article;
  initialContent?: CleanArticleContent | null;
}

export default function ArticleDetailClient({
  article: initialArticle,
  initialContent,
}: ArticleDetailClientProps) {
  const router = useRouter();
  // Try to get the live article from the store to ensure we have the latest tags/state
  const storedArticle = useArticleStore((state) => state.articlesById[initialArticle.id]);
  const article = storedArticle || initialArticle;

  const handleClose = () => {
    // Navigate back to home or previous page
    router.push('/');
  };

  return <ArticleDetail article={article} onClose={handleClose} initialContent={initialContent} />;
}
