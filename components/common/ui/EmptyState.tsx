import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  className?: string; // Allow custom styling if needed
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <div className="mb-4 text-6xl grayscale">📭</div>,
  message,
  className = '',
}) => {
  return (
    <div
      className={`flex min-h-[50vh] flex-col items-center justify-center text-stone-400 ${className}`}
    >
      {icon}
      <p className="font-serif text-xl">{message}</p>
    </div>
  );
};

export default EmptyState;
