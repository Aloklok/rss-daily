import { useState, useCallback, useEffect } from 'react';
import { Article, CleanArticleContent } from '../types';
import { getCleanArticleContent } from '../services/api';
import { useArticleStore } from '../store/articleStore'; // 【新增】导入 Zustand store
import { useUIStore } from '../store/uiStore';

export const useReader = () => {
    const [readerContent, setReaderContent] = useState<CleanArticleContent | null>(null);
    const [isReaderLoading, setIsReaderLoading] = useState(false);
    const [readerArticle, setReaderArticle] = useState<Article | null>(null);
    const articlesById = useArticleStore((state) => state.articlesById); // 【新增】从 store 获取全局文章

    const selectedArticleId = useUIStore(state => state.selectedArticleId);
    const setSelectedArticleId = useUIStore(state => state.setSelectedArticleId);

    // Map reader actions to modal actions
    const openModal = useUIStore(state => state.openModal);
    const closeModal = useUIStore(state => state.closeModal);
    const modalArticleId = useUIStore(state => state.modalArticleId);
    const modalInitialMode = useUIStore(state => state.modalInitialMode);

    const isReaderVisible = !!modalArticleId && modalInitialMode === 'reader';

    const openReader = useCallback(() => {
        // This will be handled in handleOpenReader with the ID
    }, []);

    const closeReader = closeModal;

    const addArticles = useArticleStore(state => state.addArticles);

    const [readerArticleId, setReaderArticleId] = useState<string | number | null>(null);

    const articleForReader = readerArticleId ? articlesById[readerArticleId] : null;
    const handleOpenReader = useCallback(async (article: Article) => {
        addArticles([article]);
        // 【改】设置当前正在阅读的文章 ID。
        setReaderArticleId(article.id);
        openModal(article.id, 'reader');
        setIsReaderLoading(true);
        setReaderContent(null);
        try {
            const content = await getCleanArticleContent(article);
            setReaderContent(content);
        } catch (error) {
        } finally {
            setIsReaderLoading(false);
        }
    }, [openReader, addArticles]);

    const handleShowArticleInMain = useCallback((article: Article) => {
        addArticles([article]);
        setSelectedArticleId(article.id);
        // setActiveFilter(null); // 移除此行
        closeReader();
    }, [addArticles, setSelectedArticleId, closeReader, articlesById]);

    const handleCloseArticleDetail = useCallback(() => {
        setSelectedArticleId(null);
    }, [setSelectedArticleId]);


    const handleCloseReader = useCallback(() => {
        closeReader();
        setReaderArticleId(null);
    }, [closeReader]);

    return {
        readerContent,
        isReaderLoading,
        isReaderVisible,
        articleForReader,
        handleOpenReader,
        handleShowArticleInMain,
        handleCloseReader,
        handleCloseArticleDetail,
    };
};
