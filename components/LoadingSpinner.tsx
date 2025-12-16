// components/LoadingSpinner.tsx

import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export default LoadingSpinner;
