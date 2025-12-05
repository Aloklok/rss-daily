'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ArticleDetail from '../../components/ArticleDetail';
import { Article } from '../../types';

interface ArticleDetailClientProps {
    article: Article;
}

export default function ArticleDetailClient({ article }: ArticleDetailClientProps) {
    const router = useRouter();

    const handleClose = () => {
        // Navigate back to home or previous page
        router.push('/');
    };

    return (
        <ArticleDetail
            article={article}
            onClose={handleClose}
        />
    );
}
