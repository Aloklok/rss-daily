import React from 'react';

interface SidebarTrendsProps {
  isActive: boolean;
  onClick: () => void;
}

const SidebarTrends: React.FC<SidebarTrendsProps> = ({ isActive, onClick }) => {
  return (
    <div className="dark:border-midnight-border mt-auto mb-2 border-t border-gray-200 pt-2">
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-200 ${
          isActive
            ? 'dark:bg-midnight-selected bg-gray-800 font-semibold text-white'
            : 'dark:hover:bg-midnight-card text-gray-700 hover:bg-gray-100 dark:text-gray-300'
        } cursor-pointer`}
      >
        <span>📈</span>
        <span className="flex-1">趋势</span>
      </button>
    </div>
  );
};

export default SidebarTrends;
