import React from 'react';
import { Article } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import ArticleCard from '../ArticleCard';

interface ArticleBriefingViewProps {
  article: Article;
  isLoading: boolean;
  hasBriefingData: boolean;
  onReaderModeRequest: () => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<any>;
}

const ArticleBriefingView: React.FC<ArticleBriefingViewProps> = ({
  article,
  isLoading,
  hasBriefingData,
  onReaderModeRequest,
  onStateChange,
}) => {
  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-sm text-gray-500">正在抓取智能简报...</p>
      </div>
    );
  }

  if (!hasBriefingData) {
    return (
      <div className="animate-fadeIn flex h-64 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-gray-900">暂无智能简报</h3>
        <p className="mb-6 text-gray-500">该文章尚未完成 AI 分析，请直接阅读原文。</p>
        <button
          onClick={onReaderModeRequest}
          className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          切换到原文阅读
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <ArticleCard
        article={article}
        showActions={false}
        onReaderModeRequest={onReaderModeRequest}
        onStateChange={onStateChange}
      />
    </div>
  );
};

export default ArticleBriefingView;
