import React, { memo } from 'react';
import { Article } from '../types';
import { useArticleStore } from '../store/articleStore';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';
import ArticleTitleStar from '../app/components/ArticleTitleStar';
import { useUIStore } from '../store/uiStore';

interface StreamArticleListItemProps {
    articleId: string | number;
    initialArticle?: Article; // Fallback if not in store
}

// 隐藏的一句话总结等内容，用于SEO
const HiddenSEOContent: React.FC<{ article: Article }> = ({ article }) => {
    return (
        <div style={{ display: 'none' }}>
            <h2>{article.title}</h2>
            <div>{article.summary}</div>
            <div>{article.highlights}</div>
            <div>{article.critiques}</div>
            <div>{article.marketTake}</div>
            <a href={article.link}>原文链接</a>
        </div>
    );
};

const StreamArticleListItem: React.FC<StreamArticleListItemProps> = memo(({ articleId, initialArticle }) => {
    const storeArticle = useArticleStore(state => state.articlesById[articleId]);
    const article = storeArticle || initialArticle;
    const openModal = useUIStore(state => state.openModal);

    if (!article) return null;

    const { userTagLabels: displayedUserTags } = useArticleMetadata(article);

    return (
        <>
            {/* Visual Item - Matches ArticleList.tsx EXACTLY */}
            <div
                className="group relative bg-white border border-stone-100 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden"
                onClick={() => openModal(article.id)}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-stone-50/50 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-midnight-text-primary leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            <ArticleTitleStar article={article} className="w-5 h-5 mr-1.5 inline-block align-middle -translate-y-[2px]" />
                            <span>{article.title}</span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                        <span className="text-gray-600 dark:text-midnight-text-secondary">{article.sourceName}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>{new Date(article.published).toLocaleDateString('zh-CN')}</span>
                    </div>

                    {displayedUserTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {displayedUserTags.map(tagLabel => (
                                tagLabel && (
                                    <span
                                        key={tagLabel}
                                        className={`text-xs font-semibold inline-block py-1 px-3 rounded-full ${getRandomColorClass(tagLabel)}`}
                                    >
                                        #{tagLabel}
                                    </span>
                                )
                            ))}
                        </div>
                    )}
                </div>

                {/* SEO Content Embedded Inside the Clickable Card (Invisible) */}
                <HiddenSEOContent article={article} />
            </div>
        </>
    );
});

StreamArticleListItem.displayName = 'StreamArticleListItem';

export default StreamArticleListItem;
