import React from 'react';

interface SidebarTrendsProps {
    isActive: boolean;
    onClick: () => void;
}

const SidebarTrends: React.FC<SidebarTrendsProps> = ({ isActive, onClick }) => {
    return (
        <div className="mt-auto mb-2 pt-2 border-t border-gray-200 dark:border-midnight-border">
            <button
                onClick={onClick}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 ${isActive
                    ? 'bg-gray-800 text-white font-semibold dark:bg-midnight-selected'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-midnight-card'
                    } cursor-pointer cursor-pointer`}
            >
                <span>📈</span>
                <span className="flex-1">趋势</span>
            </button>
        </div>
    );
};

export default SidebarTrends;
