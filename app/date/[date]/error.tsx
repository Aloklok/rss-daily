'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Briefing Page Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
      <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100">
        Something went wrong loading the briefing.
      </h2>
      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className="rounded-full bg-blue-600 px-6 py-2 text-white shadow-md transition-colors hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
