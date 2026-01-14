import { useEffect } from 'react';

/**
 * Hook to lock body scroll.
 * Usage: useScrollLock(isOpen);
 * @param isLocked - Whether the scroll should be locked
 */
export const useScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    // Save original overflow
    const originalStyle = window.getComputedStyle(document.body).overflow;

    // Prevent scrolling
    document.body.style.overflow = 'hidden';

    // Re-enable scrolling when component unmounts or isLocked becomes false
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
};
