import { Dictionary } from '@/app/i18n/dictionaries';

interface SidebarSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  dict: Dictionary;
}

const SidebarSearch: React.FC<SidebarSearchProps> = ({ searchQuery, setSearchQuery, onSearch, dict }) => {
  return (
    <form onSubmit={onSearch} className="relative">
      <input
        type="text"
        placeholder={dict.search.placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="dark:bg-midnight-card dark:border-midnight-border w-full rounded-xl border border-stone-200 bg-white py-2 pr-4 pl-10 text-sm placeholder-gray-400 shadow-sm transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white dark:placeholder-gray-500"
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-5 w-5 text-gray-400 dark:text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </form>
  );
};

export default SidebarSearch;
