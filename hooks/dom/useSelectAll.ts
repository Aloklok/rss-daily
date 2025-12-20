import { useEffect, RefObject } from 'react';

/**
 * Hook to handle "Select All" (Cmd+A / Ctrl+A) functionality
 * specifically for a content container.
 *
 * @param ref - Ref to the container element
 * @param isEnabled - Whether the listener should be active
 */
export const useSelectAll = <T extends HTMLElement>(
  ref: RefObject<T>,
  isEnabled: boolean = true,
) => {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        if (ref.current) {
          event.preventDefault();
          const range = document.createRange();
          range.selectNodeContents(ref.current);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isEnabled]);
};
