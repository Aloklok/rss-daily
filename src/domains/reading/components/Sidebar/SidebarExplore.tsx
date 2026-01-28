import React, { useState } from 'react';
import { getSlug, getSlugLink } from '@/domains/reading/utils/slug-helper';
import Link from 'next/link';
import { Dictionary } from '@/app/i18n/dictionaries';
import { AvailableFilters, Filter } from '@/shared/types';
import { getDisplayLabel, normalizeLabel, sortLabels } from '@/domains/reading/utils/label-display';

interface SidebarExploreProps {
  availableFilters: AvailableFilters;
  activeFilter: Filter | null;
  onFilterSelect: (filter: Filter) => void;
  selectedArticleId: string | number | null;
  dict: Dictionary;
}

const SidebarExplore: React.FC<SidebarExploreProps> = ({
  availableFilters,
  activeFilter,
  onFilterSelect,
  selectedArticleId,
  dict,
}) => {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    onFilterSelect({ type: 'tag', value: tag });
  };

  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    onFilterSelect({ type: 'category', value: category });
  };

  const isFilterActive = (type: Filter['type'], value: string) => {
    // Robust comparison using slugs to handle ID inconsistencies (emojis, etc.)
    if (activeFilter?.type !== type) return false;
    if (selectedArticleId) return false;

    // Direct match first (fast path)
    if (activeFilter.value === value) return true;

    // Slug match fallback
    return getSlug(activeFilter.value) === getSlug(value);
  };

  const listItemButtonClass = (isActive: boolean) =>
    `w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-3 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-midnight-text-secondary dark:hover:bg-midnight-card dark:hover:text-gray-200'} cursor-pointer`;

  return (
    <div className="space-y-2">
      {/* 分类 */}
      <nav className="flex flex-col">
        <button
          onClick={() => setCategoriesExpanded((prev) => !prev)}
          className="mb-1 flex w-full cursor-pointer items-center justify-between px-2 py-1 text-left text-base font-bold text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <div className="flex items-center gap-2">
            <span>📂 {dict.sidebar.categories}</span>
          </div>
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${categoriesExpanded ? 'rotate-90' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div
          className={`ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800 ${categoriesExpanded ? 'block' : 'hidden'}`}
        >
          {sortLabels(availableFilters.categories)
            .filter((category) => normalizeLabel(category.id) !== '未分类')

            .map((category) => (
              <Link
                key={category.id}
                href={getSlugLink(category.id, dict.lang as 'zh' | 'en', 'category')}
                onClick={(e) => handleCategoryClick(e, category.id)}
                prefetch={false}
                className={listItemButtonClass(isFilterActive('category', category.id))}
              >
                {/* Use pre-calculated label from server if available, fallback to getDisplayLabel */}
                <span className="flex-1 truncate">
                  {category.label ||
                    getDisplayLabel(category.id, 'category', dict.lang as 'zh' | 'en')}
                </span>
                {category.count !== undefined && category.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${isFilterActive('category', category.id) ? 'bg-white/20 text-white' : 'dark:bg-midnight-badge bg-gray-100 text-gray-500 dark:text-gray-400'}`}
                  >
                    {category.count}
                  </span>
                )}
              </Link>
            ))}
        </div>
      </nav>

      {/* 标签 */}
      <div className="flex flex-col">
        <div className="mb-1 flex w-full items-center gap-2 px-2 py-1 text-left text-base font-bold text-gray-600 dark:text-gray-300">
          <span>🏷️ {dict.sidebar.tags}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-1">
          {availableFilters.tags.map((tag) => {
            const isActive = isFilterActive('tag', tag.id);
            // Use the utility for consistent colors ONLY when active
            const colorClass = isActive
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : `bg-transparent border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-midnight-card dark:hover:text-gray-100`;

            return (
              <Link
                key={tag.id}
                href={getSlugLink(tag.id, dict.lang as 'zh' | 'en', 'tag')}
                onClick={(e) => handleTagClick(e, tag.id)}
                prefetch={false}
                className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-sm font-medium transition-all duration-200 ${colorClass} cursor-pointer`}
              >
                {/* Use pre-calculated label from server if available, fallback to getDisplayLabel */}
                <span className="truncate">
                  {tag.label?.startsWith('#')
                    ? tag.label
                    : `#${tag.label || getDisplayLabel(tag.id, 'tag', dict.lang as 'zh' | 'en')}`}
                </span>
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
