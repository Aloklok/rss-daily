'use client';

import React from 'react';
import Toast from '@/shared/ui/Toast';
import { useAppToast } from '@/shared/hooks/useAppToast';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import { useUIStore } from '@/shared/store/uiStore';
import UnifiedArticleModal from '@/domains/reading/components/article/modal/UnifiedArticleModal';
import { useUpdateArticleState } from '@/domains/interaction/hooks/useArticleMutations';
import AIChatModal from '@/domains/intelligence/components/ai/AIChatModal';

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
