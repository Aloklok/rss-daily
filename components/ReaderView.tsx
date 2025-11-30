import React, { useEffect, useState, useRef } from 'react';
import { CleanArticleContent, Article, Tag } from '../types';
import { STAR_TAG } from '../constants'; // Import STAR_TAG constant
import TagPopover from './TagPopover'; // 【新增】导入 TagPopover
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

// 【修改】更新 Props 接口
interface ReaderViewProps {
    isVisible: boolean;
    isLoading: boolean;
    content: CleanArticleContent | null;
    article: Article | null;
    onClose: () => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => void; // 新增：状态变更回调
    onGoHome: () => void; // 新增：返回首页回调
}

const ReaderView: React.FC<ReaderViewProps> = ({
    isVisible,
    isLoading,
    content,
    article,
    onClose,
    onStateChange,
    onGoHome
}) => {
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false); // 【新增】管理 TagPopover 状态
    const contentRef = useRef<HTMLDivElement>(null);

    // 即使 article 为 null，这个 hook 也会安全地返回一个空数组
    const { userTagLabels } = useArticleMetadata(article);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
            // 【增】拦截 Cmd/Ctrl + A
            if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
                if (contentRef.current) {
                    event.preventDefault(); // 阻止浏览器默认的全选行为
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
        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isVisible, onClose]);


    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isVisible]);

    // 【新增】当 ReaderView 关闭时，也关闭 TagPopover
    useEffect(() => {
        if (!isVisible) {
            setIsTagPopoverOpen(false);
        }
    }, [isVisible]);



    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            />
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col relative"> {/* 【修改】添加 relative 定位上下文 */}
                    <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                        {isLoading ? (
                            <div className="h-6 bg-gray-200 rounded-md w-1/2 animate-pulse"></div>
                        ) : (
                            <h3 className="text-lg font-semibold text-gray-800 truncate">{content?.title || '阅读模式'}</h3>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-800"
                            aria-label="Close reader view"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : content && article ? (
                            <article className="p-6 md:p-8 select-none">
                                <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 dark:text-gray-100 mb-2">{content.title}</h1>
                                {/* 4. 【修改】元数据区域重构 */}
                                <div className="mb-6 border-b pb-4">
                                    {/* 第一行：来源 */}
                                    <p className="text-gray-500 dark:text-gray-400">来源: {content.source}</p>

                                    {/* 第二行：用户标签 (仅当有标签时显示) */}
                                    {userTagLabels.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {userTagLabels.map(label => (
                                                <span key={label} className={`text-sm font-semibold inline-block py-1 px-3 rounded-full ${getRandomColorClass(label)}`}>
                                                    #{label}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* 第三行：原文链接按钮 (居右) */}
                                    <div className="mt-4 flex justify-end">
                                        <a
                                            href={article.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-stone-200 hover:bg-stone-300 text-stone-800"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                                            <span>原文</span>
                                        </a>
                                    </div>
                                </div>
                                <style>{`
                                    @media (prefers-color-scheme: dark) {
                                        #reader-view-content {
                                            color: #ffffff;
                                        }
                                        #reader-view-content p,
                                        #reader-view-content li,
                                        #reader-view-content span,
                                        #reader-view-content div {
                                            color: #ffffff !important;
                                            background-color: transparent !important;
                                        }
                                        #reader-view-content h1,
                                        #reader-view-content h2,
                                        #reader-view-content h3,
                                        #reader-view-content h4,
                                        #reader-view-content h5,
                                        #reader-view-content h6,
                                        #reader-view-content strong,
                                        #reader-view-content b {
                                            color: #ffffff !important;
                                        }
                                        #reader-view-content a {
                                            color: #60a5fa !important; /* blue-400 */
                                        }
                                        #reader-view-content pre,
                                        #reader-view-content code {
                                            background-color: #374151 !important; /* gray-700 */
                                            color: #e5e7eb !important;
                                        }
                                        #reader-view-content blockquote {
                                            border-left-color: #4b5563 !important; /* gray-600 */
                                            color: #9ca3af !important; /* gray-400 */
                                        }
                                    }
                                `}</style>
                                <div id="reader-view-content" ref={contentRef}
                                    className="prose prose-lg max-w-none text-gray-800 dark:text-gray-100 dark:prose-invert leading-relaxed select-text"
                                    dangerouslySetInnerHTML={{ __html: content.content }}
                                />
                            </article>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <p>无法加载文章内容。</p>
                            </div>
                        )}
                    </div>

                    {/* 【核心新增】浮动按钮组 */}
                    {article && (
                        <div className="absolute bottom-8 right-8 z-50 flex flex-col-reverse items-center gap-y-3">
                            <button
                                onClick={onGoHome}
                                className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-950 transition-all"
                                aria-label="Back to today's briefing"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            </button>

                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setIsTagPopoverOpen(prev => !prev)} className="p-3 bg-sky-600 text-white rounded-full shadow-lg hover:bg-sky-700 transition-all" aria-label="Tag article">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                </button>
                                {isTagPopoverOpen && article && (
                                    <TagPopover
                                        onClose={() => setIsTagPopoverOpen(false)}
                                        onStateChange={onStateChange}
                                    />
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    const isStarred = article.tags?.includes(STAR_TAG);
                                    onStateChange(article.id, isStarred ? [] : [STAR_TAG], isStarred ? [STAR_TAG] : []);
                                }}
                                className={`p-3 text-white rounded-full shadow-lg transition-all ${article.tags?.includes(STAR_TAG) ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-950'
                                    }`}
                                aria-label={article.tags?.includes(STAR_TAG) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                {article.tags?.includes(STAR_TAG) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ReaderView;