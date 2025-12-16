import React from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'info' }) => {
  if (!isVisible) return null;

  const bgColor =
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-800';
  const icon =
    type === 'success' ? (
      <svg
        className="h-6 w-6 text-white"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ) : type === 'error' ? (
      <svg
        className="h-6 w-6 text-white"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ) : (
      <svg
        className="h-6 w-6 text-white"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );

  return (
    <div
      className={`fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 transform items-center rounded-lg p-4 text-white shadow-lg transition-all duration-300 ${bgColor}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: `translate(-50%, ${isVisible ? '0' : '20px'})`,
      }}
    >
      {icon}
      <span className="ml-3 font-medium">{message}</span>
      <button
        onClick={onClose}
        className="-mr-1 ml-4 rounded-full p-1.5 transition-colors hover:bg-white/20"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>
    </div>
  );
};

export default Toast;
