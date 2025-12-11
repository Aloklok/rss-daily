import React, { useState } from 'react';
import Link from 'next/link';
import { AvailableFilters, Filter } from '../../types';

interface SidebarExploreProps {
    availableFilters: AvailableFilters;
    activeFilter: Filter | null;
    onFilterSelect: (filter: Filter) => void;
    selectedArticleId: string | number | null;
}

const SidebarExplore: React.FC<SidebarExploreProps> = ({
    availableFilters,
    activeFilter,
    onFilterSelect,
    selectedArticleId
}) => {
    const [categoriesExpanded, setCategoriesExpanded] = useState(false);

    const isFilterActive = (type: Filter['type'], value: string) => {
        return activeFilter?.type === type && activeFilter?.value === value && !selectedArticleId;
    };

    const listItemButtonClass = (isActive: boolean) => `w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-3 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-midnight-text-secondary dark:hover:bg-midnight-card dark:hover:text-gray-200'}`;

    return (
        <div className="space-y-2">
            {/* 分类 */}
            <nav className="flex flex-col">
                <button onClick={() => setCategoriesExpanded(prev => !prev)} className="w-full text-left px-2 py-1 flex items-center justify-between text-base font-bold text-gray-600 dark:text-gray-300 mb-1 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <div className="flex items-center gap-2">
                        <span>📂 分类</span>
                    </div>
                    <svg className={`h-4 w-4 transition-transform duration-200 ${categoriesExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                <div className={`space-y-0.5 ml-3 pl-3 border-l-2 border-gray-100 dark:border-gray-800 ${categoriesExpanded ? 'block' : 'hidden'}`}>
                    {availableFilters.categories
                        .filter(category => category.label !== '未分类')
                        .map(category => (
                            <Link
                                key={category.id}
                                href={`/stream/${encodeURIComponent(category.id)}`}
                                onClick={() => onFilterSelect({ type: 'category', value: category.id })}
                                className={listItemButtonClass(isFilterActive('category', category.id))}
                            >
                                <span className="flex-1 truncate">{category.label}</span>
                                {category.count !== undefined && category.count > 0 && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFilterActive('category', category.id) ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-midnight-badge dark:text-gray-400'}`}>
                                        {category.count}
                                    </span>
                                )}
                            </Link>
                        ))}
                </div>
            </nav>

            {/* 标签 */}
            <div className="flex flex-col">
                <div className="w-full text-left px-2 py-1 flex items-center gap-2 text-base font-bold text-gray-600 dark:text-gray-300 mb-1">
                    <span>🏷️ 标签</span>
                </div>
                <div className="grid grid-cols-2 gap-2 px-1">
                    {availableFilters.tags.map(tag => {
                        const isActive = isFilterActive('tag', tag.id);
                        // Use the utility for consistent colors ONLY when active
                        const colorClass = isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : `bg-transparent border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-midnight-card dark:hover:text-gray-100`;

                        return (
                            <Link
                                key={tag.id}
                                href={`/stream/${encodeURIComponent(tag.id)}`}
                                onClick={() => onFilterSelect({ type: 'tag', value: tag.id })}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md transition-all duration-200 flex items-center justify-between text-sm font-medium border ${colorClass}`}
                            >
                                <span className="truncate">#{tag.label}</span>
                                {tag.count !== undefined && tag.count > 0 && (
                                    <span className={`text-xs opacity-60 ${isActive ? 'text-white' : ''}`}>
                                        {tag.count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SidebarExplore;
