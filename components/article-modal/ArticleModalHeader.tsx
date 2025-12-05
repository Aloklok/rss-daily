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
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'briefing' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    📊 智能简报
                </button>
                <button
                    onClick={() => setViewMode('reader')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'reader' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    📄 原文阅读
                </button>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default ArticleModalHeader;
