import React from 'react';
import { Article, Filter } from '../../types';

interface SidebarStarredProps {
    isExpanded: boolean;
    onToggle: () => void;
    isLoading: boolean;
    articles: Article[];
    onArticleClick: (article: Article) => void;
    starredCount: number;
    activeFilter: Filter | null;
    selectedArticleId: string | number | null;
}

const SidebarStarred: React.FC<SidebarStarredProps> = ({
    isExpanded,
    onToggle,
    isLoading,
    articles,
    onArticleClick,
    starredCount,
    activeFilter,
    selectedArticleId
}) => {
    const isFilterActive = activeFilter?.type === 'starred';
    const listItemButtonClass = (isActive: boolean) => `w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 text-gray-700 ${isActive ? 'bg-gray-800 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'}`;

    return (
        <nav className="flex flex-col">
            <button onClick={onToggle} className={listItemButtonClass(isFilterActive)}>
                <span>⭐</span>
                <span className="flex-1">我的收藏</span>
                {starredCount > 0 && (
                    <span className="text-xs font-medium bg-gray-200 text-gray-600 rounded-full h-5 w-5 flex items-center justify-center">
                        {starredCount}
                    </span>
                )}
                <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {isExpanded && (
                <div className="mt-2 ml-4 pl-3 border-l border-gray-200 space-y-1">
                    {isLoading && articles.length === 0 ? (
                        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>)}</div>
                    ) : (
                        articles.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">暂无收藏</div>
                        ) : (
                            articles.map(article => (
                                <button key={article.id} onClick={() => onArticleClick(article)}
                                    className={listItemButtonClass(selectedArticleId === article.id)}>
                                    <span className="truncate">{article.title}</span>
                                </button>
                            ))
                        )
                    )}
                </div>
            )}
        </nav>
    );
};

export default SidebarStarred;
