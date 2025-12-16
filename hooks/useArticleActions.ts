import { useCallback } from 'react';
import { Article } from '../types';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import { useUpdateArticleState, useMarkAllAsRead } from './useArticles';
import { useToastStore } from '../store/toastStore';

export const useArticleActions = () => {
  const showToast = useToastStore((state) => state.showToast);
  const setSelectedArticleId = useUIStore((state) => state.setSelectedArticleId);
  const openModal = useUIStore((state) => state.openModal);
  const addArticles = useArticleStore((state) => state.addArticles);

  const { mutateAsync: updateArticleState, isPending: isUpdatingArticle } = useUpdateArticleState();
  const { mutate: markAllAsRead, isPending: isMarkingAsRead } = useMarkAllAsRead();

  const handleOpenFromList = useCallback(
    (article: Article) => {
      addArticles([article]);
      openModal(article.id, 'briefing');
    },
    [addArticles, openModal],
  );

  const handleOpenFromBriefingCard = useCallback(
    (article: Article) => {
      addArticles([article]);
      openModal(article.id, 'reader');
    },
    [addArticles, openModal],
  );

  const handleOpenMainDetail = useCallback(
    (article: Article) => {
      setSelectedArticleId(article.id);
      addArticles([article]);
    },
    [setSelectedArticleId, addArticles],
  );

  const handleArticleStateChange = async (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => {
    await updateArticleState(
      { articleId, tagsToAdd, tagsToRemove },
      {
        onSuccess: (_updatedArticle) => {
          // Success handling if needed
        },
        onError: (_error) => {
          showToast('标签更新失败', 'error');
        },
      },
    );
  };

  const handleMarkAllClick = (articleIdsInView: (string | number)[]) => {
    if (articleIdsInView.length > 0) {
      markAllAsRead(articleIdsInView);
    } else {
      showToast('没有需要标记的文章', 'info');
    }
  };

  return {
    handleOpenFromList,
    handleOpenFromBriefingCard,
    handleOpenMainDetail,
    handleArticleStateChange,
    handleMarkAllClick,
    isUpdatingArticle,
    isMarkingAsRead,
  };
};
