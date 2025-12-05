// components/BriefingDetailView.tsx

import React, { useEffect } from 'react';
import { Article } from '../types';
import ArticleCard from './ArticleCard'; // 我们将复用 ArticleCard

interface BriefingDetailViewProps {
    article: Article;
    onClose: () => void;
}

const BriefingDetailView: React.FC<BriefingDetailViewProps> = ({ article, onClose }) => {
    // 键盘 Esc 关闭
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // 锁定 body 滚动
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <>
            {/* 背景遮罩层 */}
            <div 
                onClick={onClose}
                className="fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ease-in-out"
            />
            {/* 滑动面板 (样式借鉴自 ReaderView) */}
            <div
                className="fixed top-0 right-0 h-full w-full max-w-2xl bg-neutral-50 bg-paper-texture shadow-2xl z-40 transform transition-transform duration-300 ease-in-out translate-x-0"
            >
                <div className="h-full flex flex-col">
                    {/* 头部，提供标题和关闭按钮 */}
                    <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white/50 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-gray-800 truncate">简报</h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-800"
                            aria-label="Close detail view"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 核心内容区 */}
                    <div className="flex-grow overflow-y-auto p-4 md:p-6">
                        {/* 
                           【核心】在这里渲染 ArticleCard 组件 
                           我们传入 showActions={false} 来隐藏卡片自带的操作按钮，因为面板有自己的关闭按钮。
                           onStateChange 和 onReaderModeRequest 也不需要，因为这里只是展示。
                        */}
                        <ArticleCard
                            article={article}
                            showActions={false}
                            onStateChange={async () => {}}
                            onReaderModeRequest={() => {}}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default BriefingDetailView;