import React from 'react';

interface ArticleModalHeaderProps {
  viewMode: 'briefing' | 'reader';
  setViewMode: (mode: 'briefing' | 'reader') => void;
  onClose: () => void;
}

const ArticleModalHeader: React.FC<ArticleModalHeaderProps> = ({
  viewMode,
  setViewMode,
  onClose: _onClose,
}) => {
  return (
    <div className="dark:bg-midnight-sidebar z-10 flex items-center gap-3 border-b border-stone-100 bg-white/80 p-3 backdrop-blur-xl dark:border-white/10">
      <div className="flex rounded-lg bg-gray-200/80 p-1 dark:bg-gray-800/80">
        <button
          onClick={() => setViewMode('briefing')}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'briefing'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-gray-700 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📊 智能简报
        </button>
        <button
          onClick={() => setViewMode('reader')}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'reader'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-gray-700 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📄 原文阅读
        </button>
      </div>
    </div>
  );
};

export default ArticleModalHeader;
