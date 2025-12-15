import React from 'react';

interface SidebarSearchProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onSearch: (e: React.FormEvent) => void;
}

const SidebarSearch: React.FC<SidebarSearchProps> = ({ searchQuery, setSearchQuery, onSearch }) => {
    return (
        <form onSubmit={onSearch} className="relative">
            <input
                type="text"
                placeholder="搜索简报关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-midnight-card border border-stone-200 dark:border-midnight-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder-gray-400 dark:placeholder-gray-500 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </form>
    );
};

export default SidebarSearch;
