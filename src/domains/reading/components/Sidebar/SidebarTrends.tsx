import React from 'react';
import { Dictionary } from '@/app/i18n/dictionaries';

interface SidebarTrendsProps {
  isActive: boolean;
  onClick: () => void;
  dict: Dictionary;
}

const SidebarTrends: React.FC<SidebarTrendsProps> = ({ isActive, onClick, dict }) => {
  return (
    <div className="dark:border-midnight-border mt-auto mb-2 border-t border-gray-200 pt-2">
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-200 ${isActive
            ? 'dark:bg-midnight-selected bg-gray-800 font-semibold text-white'
            : 'dark:hover:bg-midnight-card text-gray-700 hover:bg-gray-100 dark:text-gray-300'
          } cursor-pointer`}
      >
        <span>📈</span>
        <span className="flex-1">{dict.trends.trends}</span>
      </button>
    </div>
  );
};

export default SidebarTrends;
