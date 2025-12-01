import React, { useRef, useEffect, useState } from 'react';
import { CleanArticleContent, Article } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import { getRandomColorClass } from '../../utils/colorUtils';

interface ArticleReaderViewProps {
    article: Article;
    readerContent: CleanArticleContent | null;
    isLoading: boolean;
    userTagLabels: string[];
}

const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({ article, readerContent, isLoading, userTagLabels }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!readerContent || !contentRef.current) return;

        try {
            const text = contentRef.current.innerText;
            const fullText = `${readerContent.title}\n\n${text}`;
            await navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    // Handle Ctrl/Cmd+A to select only article content
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
                if (contentRef.current) {
                    event.preventDefault();
                    const range = document.createRange();
                    range.selectNodeContents(contentRef.current);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            }
        };
        // We attach this listener here, but the parent also has one. 
        // The parent's listener checks for viewMode === 'reader'.
        // Since this component is only mounted when viewMode === 'reader', this is safe.
        // However, to avoid duplication, we can rely on the parent or keep it here.
        // The plan said "Keep the keyboard event listeners... in the main modal component".
        // So I will REMOVE this effect from here and let the parent handle it, passing the ref if needed.
        // But wait, the parent needs the ref to the content div.
        // So I should forward the ref or expose it.
        // Actually, the parent's logic `if (contentRef.current)` implies the parent holds the ref.
        // But the content is rendered inside this component.
        // So I should probably move the keydown logic HERE or pass the ref down.
        // Let's keep the logic in the parent for now as per plan, but the parent needs access to the DOM node.
        // I'll use `forwardRef` or just let this component handle the selection logic since it owns the DOM.
        // I'll add the listener here for better encapsulation.

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    if (isLoading) return <LoadingSpinner />;

    if (!readerContent) return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>无法加载文章内容。</p>
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 mt-2 inline-block">查看原文</a>
        </div>
    );

    return (
        <article className="p-6 md:p-8 select-none animate-fadeIn">
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 dark:text-gray-100 mb-2">{readerContent.title}</h1>
            <div className="mb-6 border-b dark:border-gray-700 pb-4">
                <p className="text-gray-500 dark:text-gray-400">来源: {readerContent.source}</p>
                {userTagLabels.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {userTagLabels.map(label => (
                            <span key={label} className={`text-sm font-semibold inline-block py-1 px-3 rounded-full ${getRandomColorClass(label)}`}>
                                #{label}
                            </span>
                        ))}
                    </div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors"
                        title="复制全文"
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-green-600 dark:text-green-400">已复制</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                                <span>复制</span>
                            </>
                        )}
                    </button>
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                        <span>原文</span>
                    </a>
                </div>
            </div>
            <style>{`
                @media (prefers-color-scheme: dark) {
                    #article-reader-content {
                        color: #ffffff;
                    }
                    #article-reader-content p,
                    #article-reader-content li,
                    #article-reader-content span,
                    #article-reader-content div {
                        color: #ffffff !important;
                        background-color: transparent !important;
                    }
                    #article-reader-content h1,
                    #article-reader-content h2,
                    #article-reader-content h3,
                    #article-reader-content h4,
                    #article-reader-content h5,
                    #article-reader-content h6,
                    #article-reader-content strong,
                    #article-reader-content b {
                        color: #ffffff !important;
                    }
                    #article-reader-content a {
                        color: #60a5fa !important; /* blue-400 */
                    }
                    #article-reader-content pre,
                    #article-reader-content code {
                        background-color: #374151 !important; /* gray-700 */
                        color: #e5e7eb !important;
                    }
                    #article-reader-content blockquote {
                        border-left-color: #4b5563 !important; /* gray-600 */
                        color: #9ca3af !important; /* gray-400 */
                    }
                }
            `}</style>
            <div id="article-reader-content" ref={contentRef} className="prose prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-100 leading-relaxed select-text" dangerouslySetInnerHTML={{ __html: readerContent.content }} />
        </article>
    );
};

export default ArticleReaderView;
