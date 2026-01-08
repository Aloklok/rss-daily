'use client';

import React from 'react';
import Toast from '../common/ui/Toast';
import { useAppToast } from '../../hooks/useAppToast';
import { useArticleStore } from '../../store/articleStore';
import { useUIStore } from '../../store/uiStore';
import UnifiedArticleModal from '../features/article/modal/UnifiedArticleModal';
import { useUpdateArticleState } from '../../hooks/useArticles';
import AIChatModal from '../features/ai/AIChatModal';

export default function GlobalUI() {
  const { toast, hideToast } = useAppToast();
  const modalArticleId = useUIStore((state) => state.modalArticleId);
  const modalInitialMode = useUIStore((state) => state.modalInitialMode);
  const closeModal = useUIStore((state) => state.closeModal);
  const articlesById = useArticleStore((state) => state.articlesById);

  // We need a way to handle state changes from the modal.
  // Ideally this should come from a hook, but GlobalUI is just a shell.
  // Let's import the hook here.
  const { mutateAsync: updateArticleState } = useUpdateArticleState();

  const handleStateChange = async (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => {
    return updateArticleState({ articleId, tagsToAdd, tagsToRemove });
  };

  const selectedArticle = modalArticleId ? articlesById[modalArticleId] : null;

  return (
    <div data-testid="global-ui">
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
      />
      {selectedArticle && (
        <UnifiedArticleModal
          key={selectedArticle.id}
          article={selectedArticle}
          onClose={closeModal}
          onStateChange={handleStateChange}
          initialMode={modalInitialMode}
        />
      )}
      <AIChatModal />
    </div>
  );
}

