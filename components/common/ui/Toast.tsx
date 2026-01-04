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
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-[100] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 overflow-hidden rounded-2xl p-4 text-white shadow-2xl backdrop-blur-xl transition-all duration-500 md:max-w-xl ${bgColor}`}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
        }}
      >
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm leading-relaxed font-bold tracking-wide break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="-mt-1 -mr-1 shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/20"
        >
          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
