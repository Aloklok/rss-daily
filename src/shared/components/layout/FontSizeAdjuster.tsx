'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/shared/store/uiStore';
import { RotateCcw } from 'lucide-react';

export default function FontSizeAdjuster() {
  const { fontSize, setFontSize, isDesktopCollapsed } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDecrease = () => setFontSize(Math.max(12, fontSize - 2));
  const handleIncrease = () => setFontSize(Math.min(24, fontSize + 2));
  const handleReset = () => setFontSize(16);

  const scale = fontSize / 16;
  
  const containerClasses =
    'flex items-center p-0.5 rounded-full bg-stone-100/80 backdrop-blur-md border border-stone-200/50 dark:bg-stone-800/80 dark:border-white/5 shadow-inner select-none transition-all';
  
  const btnClasses = 'flex items-center justify-center px-2 py-1 text-xs font-bold transition-all duration-300 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-200/80 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <>
      <style>{`
        .reading-area-scale {
          zoom: ${scale};
          transition: zoom 0.3s ease;
        }
        .no-reading-scale {
          zoom: calc(1 / ${scale});
          transition: zoom 0.3s ease;
        }
        /* For Firefox support (v126+ supports zoom natively, older ones might use MozTransform, but zoom is standardizing) */
        @-moz-document url-prefix() {
          .reading-area-scale {
             transform: scale(${scale});
             transform-origin: top center;
          }
          .no-reading-scale {
             transform: scale(calc(1 / ${scale}));
             transform-origin: center center;
          }
        }
      `}</style>

      {mounted && (
        <div
          className={`absolute top-16 left-4 z-30 md:top-20 ${isDesktopCollapsed ? 'md:left-20' : 'md:left-8'}`}
        >
          <div className={containerClasses} title="调整阅读字体大小">
            <button 
              onClick={handleDecrease}
              className={btnClasses}
              disabled={fontSize <= 12}
              aria-label="缩小字体"
            >
              A-
            </button>
            <button 
              onClick={handleReset}
              className={btnClasses}
              aria-label="恢复默认字体"
              title="恢复默认字体"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button 
              onClick={handleIncrease}
              className={btnClasses}
              disabled={fontSize >= 24}
              aria-label="放大字体"
            >
              A+
            </button>
          </div>
        </div>
      )}
    </>
  );
}
