import React, { useState } from 'react';
import { AvailableFilters, Filter } from '../../types';

interface SidebarExploreProps {
    availableFilters: AvailableFilters;
    activeFilter: Filter | null;
    onFilterSelect: (filter: Filter) => void;
}

const SidebarExplore: React.FC<SidebarExploreProps> = ({
    availableFilters,
    activeFilter,
    onFilterSelect
}) => {
    const [categoriesExpanded, setCategoriesExpanded] = useState(false);

    const isFilterActive = (type: Filter['type'], value: string) => {
        return activeFilter?.type === type && activeFilter?.value === value;
    };

    const listItemButtonClass = (isActive: boolean) => `w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 text-gray-700 ${isActive ? 'bg-gray-800 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'}`;

    return (
        <div className="space-y-1">
            {/* 分类 */}
            <nav className="flex flex-col">
                <button onClick={() => setCategoriesExpanded(prev => !prev)} className={listItemButtonClass(false)}>
                    <span>📂</span>
                    <span className="flex-1">分类</span>
                    <svg className={`h-4 w-4 transition-transform ${categoriesExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {categoriesExpanded && (
                    <div className="mt-2 ml-4 pl-3 border-l border-gray-200 space-y-1">
                        {availableFilters.categories
                            .filter(category => category.label !== '未分类')
                            .map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => onFilterSelect({ type: 'category', value: category.id })}
                                    className={listItemButtonClass(isFilterActive('category', category.id))}
                                >
                                    <span className="flex-1 truncate">{category.label}</span>
                                    {category.count !== undefined && category.count > 0 && (
                                        <span className="text-xs font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                                            {category.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                    </div>
                )}
            </nav>

            {/* 标签 */}
            <div className="flex flex-col">
                <div className="w-full text-left px-3 py-2 flex items-center gap-3 text-gray-600">
                    <span>🏷️</span>
                    <span className="flex-1">标签</span>
                </div>
                <div className="grid grid-cols-1 gap-y-1 px-3 md:grid-cols-2 md:gap-x-2">
                    {availableFilters.tags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => onFilterSelect({ type: 'tag', value: tag.id })}
                            className={`w-full text-left px-2 py-1.5 rounded-md transition-colors duration-200 flex items-center justify-between text-sm ${isFilterActive('tag', tag.id)
                                ? 'bg-gray-800 text-white font-semibold'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className="truncate">#{tag.label}</span>
                            {tag.count !== undefined && tag.count > 0 && (
                                <span className={`text-xs font-medium rounded-full px-1.5 py-0.5 ${isFilterActive('tag', tag.id) ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {tag.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SidebarExplore;
