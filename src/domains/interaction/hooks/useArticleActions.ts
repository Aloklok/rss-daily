import { useCallback } from 'react';
import { Article } from '@/shared/types';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useUIStore } from '@/shared/store/uiStore';
import {
  useUpdateArticleState,
  useMarkAllAsRead,
} from '@/domains/interaction/hooks/useArticleMutations';
import { useToastStore } from '@/shared/store/toastStore';
import { READ_TAG } from '@/domains/interaction/constants';

export const useArticleActions = () => {
  const showToast = useToastStore((state) => state.showToast);
  const setSelectedArticleId = useUIStore((state) => state.setSelectedArticleId);
  const openModal = useUIStore((state) => state.openModal);
  const addArticles = useArticleStore((state) => state.addArticles);
  const articlesById = useArticleStore((state) => state.articlesById);

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
    // Determine the current date context from active filter
    const activeFilter = useUIStore.getState().activeFilter;
    const currentDate = activeFilter?.type === 'date' ? activeFilter.value : undefined;

    // 过滤出未读的文章 ID
    const unreadIds = articleIdsInView.filter((id) => {
      const article = articlesById[id];
      return article && !article.tags?.includes(READ_TAG);
    });

    if (unreadIds.length > 0) {
      markAllAsRead({ articleIds: unreadIds, date: currentDate });
    } else {
      showToast('没有需要标记的未读文章', 'info');
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
