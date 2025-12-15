import React from 'react';

interface ArticleModalHeaderProps {
    viewMode: 'briefing' | 'reader';
    setViewMode: (mode: 'briefing' | 'reader') => void;
    onClose: () => void;
}

const ArticleModalHeader: React.FC<ArticleModalHeaderProps> = ({ viewMode, setViewMode, onClose }) => {
    return (
        <div className="flex items-center gap-3 p-3 border-b border-stone-100 dark:border-white/10 bg-white/80 dark:bg-midnight-sidebar backdrop-blur-xl z-10">
            <div className="flex bg-gray-200/80 dark:bg-gray-800/80 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode('briefing')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${viewMode === 'briefing' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    📊 智能简报
                </button>
                <button
                    onClick={() => setViewMode('reader')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${viewMode === 'reader' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    📄 原文阅读
                </button>
            </div>
        </div>
    );
};

export default ArticleModalHeader;
