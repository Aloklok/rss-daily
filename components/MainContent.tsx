import React from 'react';
import ArticleDetail from './ArticleDetail';
import TrendsView from './TrendsView';
import Briefing from './Briefing';
import ArticleList from './ArticleList';
import LoadingSpinner from './LoadingSpinner';
import { Article, Filter } from '../types';

interface MainContentProps {
    isLoading: boolean;
    sidebarArticle: Article | null;
    activeFilter: Filter | null;
    briefingArticleIds: (string | number)[] | null;
    searchResultIds: (string | number)[] | null;
    filteredArticleIds: (string | number)[] | null;
    timeSlot: 'morning' | 'afternoon' | 'evening' | null;
    isSidebarCollapsed: boolean;

    // Pagination props
    fetchNextPage?: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;

    // Callbacks
    onCloseArticle: () => void;
    onOpenFromBriefingCard: (article: Article) => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
    onTimeSlotChange: (slot: 'morning' | 'afternoon' | 'evening' | null) => void;
    onToggleSidebar: () => void;
    onOpenFromList: (article: Article) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
    isLoading,
    sidebarArticle,
    activeFilter,
    briefingArticleIds,
    searchResultIds,
    filteredArticleIds,
    timeSlot,
    isSidebarCollapsed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    onCloseArticle,
    onOpenFromBriefingCard,
    onStateChange,
    onTimeSlotChange,
    onToggleSidebar,
    onOpenFromList
}) => {
    // Only show global spinner if NOT in date view
    if (isLoading && activeFilter?.type !== 'date') {
        return <LoadingSpinner />;
    }

    if (sidebarArticle) {
        return (
            <ArticleDetail
                article={sidebarArticle}
                onClose={onCloseArticle}
            />
        );
    }

    if (activeFilter?.type === 'trends') {
        return <TrendsView />;
    }

    if (activeFilter?.type === 'date') {
        return (
            <Briefing
                articleIds={briefingArticleIds || []}
                timeSlot={timeSlot as "morning" | "afternoon" | "evening" | null}
                selectedReportId={1}
                onReportSelect={() => { }}
                onReaderModeRequest={onOpenFromBriefingCard}
                onStateChange={onStateChange}
                onTimeSlotChange={onTimeSlotChange}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
                articleCount={briefingArticleIds?.length || 0}
                isLoading={isLoading}
            />
        );
    }

    if (activeFilter?.type === 'category' || activeFilter?.type === 'tag' || activeFilter?.type === 'search') {
        return (
            <ArticleList
                articleIds={activeFilter.type === 'search' ? (searchResultIds || []) : (filteredArticleIds || [])}
                onOpenArticle={onOpenFromList}
                isLoading={isLoading}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />
        );
    }

    return (
        <div className="p-8 text-center text-gray-500">
            选择一个分类或标签查看文章。
        </div>
    );
};
