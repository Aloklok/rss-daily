import React, { useState } from 'react';
import { Article, CleanArticleContent } from '@/types';
import LoadingSpinner from '../../../common/ui/Spinner';
import ArticleCard from '../../briefing/BriefCard';
import { useUIStore } from '@/store/uiStore';
import { generateBriefingAction } from '@/app/actions/briefing';
import { useAppToast } from '@/hooks/useAppToast';
import { useQueryClient } from '@tanstack/react-query';
import { useArticleStore } from '@/store/articleStore';

interface ArticleBriefingViewProps {
  article: Article;
  readerContent?: CleanArticleContent | null;
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
  readerContent,
  isLoading,
  hasBriefingData,
  onReaderModeRequest,
  onStateChange,
}) => {
  const isAdmin = useUIStore((state) => state.isAdmin);
  const { showToast } = useAppToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();
  const updateArticle = useArticleStore((state) => state.updateArticle);

  const handleGenerateBriefing = async () => {
    console.log('👆 User clicked Generate Briefing button');
    setIsGenerating(true);
    try {
      // Optimization:
      // 1. Pass the full article object (metadata).
      // 2. Pass the client-side cached reader content if available (User Priority).
      const result = await generateBriefingAction(article, readerContent?.content);

      if (result.success) {
        showToast('智能简报生成成功', 'success');

        // --- 1. Consolue Logs (Explicit) ---
        console.log('✅ Briefing Generated Successfully!');
        console.log('📊 Full Gemini Metadata (Tokens, Safety, etc.):', result.metadata);
        console.log('📥 parsed Briefing Content:', result.briefing);
        console.log('📤 full Result Debug:', result);

        // --- 2. Update UI Immediately (No Refresh) ---

        // A. Optimistically update the global store
        // This should trigger UnifiedArticleModal to re-render if it (or its parent) listens to the store
        if (result.briefing) {
          const updatedArticle = {
            ...article,
            ...result.briefing, // Merge AI results (summary, verdict, etc.)
            // Ensure ID ensures overwrite
            id: article.id,
          };

          // 1. Update Zustand Store (Immediately updates UI across app)
          updateArticle(updatedArticle);

          // 2. Precisely update React Query cache to keep it in sync with store
          // This prevents a triggered GET request from fetching stale data
          queryClient.setQueryData(['article', 'details', article.id], updatedArticle);

          // Force re-evaluation of 'hasBriefingData' might happen automatically
          // if UnifiedArticleModal re-renders.
          // If UnifiedArticleModal receives 'article' prop from a parent list that reads from store, it works.
        }
      } else {
        showToast(`生成失败: ${result.error}`, 'error');
        console.error('Generaton Failed:', result.error);
      }
    } catch (err) {
      showToast('生成过程中发生错误', 'error');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-sm text-gray-500">
          {isGenerating ? '正在请求 Gemini 生成简报...' : '正在检查简报状态...'}
        </p>
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

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onReaderModeRequest}
            className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            切换到原文阅读
          </button>

          {isAdmin && (
            <button
              onClick={handleGenerateBriefing}
              disabled={isGenerating}
              className="group flex cursor-pointer items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-4 py-2 text-purple-700 transition-colors hover:bg-purple-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.96l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.96 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.96l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 5.618a1 1 0 01-.718.784l-5.618.683a1 1 0 000 1.898l5.618.683a1 1 0 01.718.784l.683 5.618a1 1 0 001.898 0l.683-5.618a1 1 0 01.718-.784l5.618-.683a1 1 0 000-1.898l-5.618-.683a1 1 0 01-.718-.784l-.683-5.618z" />
              </svg>
              <span>{isGenerating ? '正在生成...' : '⚡️ 生成智能简报'}</span>
            </button>
          )}
        </div>
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

      {isAdmin && (
        <div className="mt-8 flex justify-center border-t border-gray-100 pt-6">
          <button
            onClick={handleGenerateBriefing}
            disabled={isGenerating}
            className="group flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            <span>{isGenerating ? '正在重新生成...' : '⚡️ 重新生成简报'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ArticleBriefingView;
