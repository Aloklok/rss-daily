import React, { useEffect, useState } from 'react';
import { CleanArticleContent } from '../types';

interface ArticlePreviewModalProps {
    url: string | null;
    onClose: () => void;
}

const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({ url, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [content, setContent] = useState<CleanArticleContent | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (url) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [url, onClose]);

    useEffect(() => {
        let mounted = true;
        if (!url) {
            setContent(null);
            setError(null);
            return;
        }

        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const resp = await fetch(`/api/readability?url=${encodeURIComponent(url)}`);
                if (!resp.ok) {
                    const text = await resp.text();
                    throw new Error(`Readability API failed: ${resp.status} ${text}`);
                }
                const data = await resp.json();
                if (mounted) setContent(data as CleanArticleContent);
            } catch (err: any) {
                console.error('Failed to load readability content', err);
                if (mounted) setError(err.message || 'Failed to load article');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [url]);

    if (!url) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
                    <div className="text-sm text-gray-500 truncate">{url}</div>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                            在新标签页中打开
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 rounded-full hover:bg-gray-200"
                            aria-label="Close preview"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full w-full p-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-600">
                            <p>无法加载阅读模式内容。</p>
                            <pre className="text-xs mt-2 text-left whitespace-pre-wrap">{error}</pre>
                            <div className="mt-4">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600">在新标签页打开原文</a>
                            </div>
                        </div>
                    ) : content ? (
                        <article className="p-6 md:p-8">
                            <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 dark:text-gray-100 mb-2">{content.title}</h1>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 border-b pb-4">来源: {content.source}</p>
                            <style>{`
                                @media (prefers-color-scheme: dark) {
                                    #article-preview-content {
                                        color: #ffffff;
                                    }
                                    #article-preview-content p,
                                    #article-preview-content li,
                                    #article-preview-content span,
                                    #article-preview-content div {
                                        color: #ffffff !important;
                                        background-color: transparent !important;
                                    }
                                    #article-preview-content h1,
                                    #article-preview-content h2,
                                    #article-preview-content h3,
                                    #article-preview-content h4,
                                    #article-preview-content h5,
                                    #article-preview-content h6,
                                    #article-preview-content strong,
                                    #article-preview-content b {
                                        color: #ffffff !important;
                                    }
                                    #article-preview-content a {
                                        color: #60a5fa !important; /* blue-400 */
                                    }
                                    #article-preview-content pre,
                                    #article-preview-content code {
                                        background-color: #374151 !important; /* gray-700 */
                                        color: #e5e7eb !important;
                                    }
                                    #article-preview-content blockquote {
                                        border-left-color: #4b5563 !important; /* gray-600 */
                                        color: #9ca3af !important; /* gray-400 */
                                    }
                                }
                            `}</style>
                            <div
                                id="article-preview-content"
                                className="prose prose-lg max-w-none text-gray-800 dark:text-gray-100 dark:prose-invert leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: content.content }}
                            />
                        </article>
                    ) : (
                        <div className="p-6 text-center text-gray-500">无法获得文章内容</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArticlePreviewModal;