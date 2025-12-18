import React from 'react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  loadingLabel?: string;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onClick,
  isLoading,
  disabled = false,
  className = '',
  label = 'Load More',
  loadingLabel = 'Loading...',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 font-medium transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 ${className}`}
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
};

export default LoadMoreButton;
