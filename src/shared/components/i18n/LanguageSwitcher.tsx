'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/shared/store/uiStore';

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const isDesktopCollapsed = useUIStore((state) => state.isDesktopCollapsed);
  const isEn = pathname?.startsWith('/en');

  // Calculate base path (pure path without language prefix)
  // If isEn, strip '/en'. If strictly 'en', resulting path might be empty string -> default to '/'
  const rawPath = isEn ? pathname?.replace(/^\/en/, '') || '/' : pathname || '/';

  // Normalize rawPath to ensure it handles root correctly for rebuilding paths
  const cleanPath = rawPath === '/' ? '' : rawPath;

  const zhPath = cleanPath || '/';
  const enPath = `/en${cleanPath}`;

  const containerClasses =
    'flex items-center p-1 rounded-full bg-stone-100/80 backdrop-blur-md border border-stone-200/50 dark:bg-stone-800/80 dark:border-white/5 shadow-inner select-none';

  const itemBaseClasses =
    'relative z-10 block px-3 py-1 text-xs font-bold transition-all duration-300 rounded-full';

  const activeClasses =
    'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 dark:bg-stone-700 dark:text-indigo-400 dark:ring-white/10';

  const inactiveClasses =
    'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300';

  return (
    <div
      className={`absolute top-4 left-4 z-30 md:top-6 ${isDesktopCollapsed ? 'md:left-20' : 'md:left-8'}`}
    >
      <div className={containerClasses}>
        <Link
          href={zhPath}
          prefetch={true}
          className={`${itemBaseClasses} ${!isEn ? activeClasses : inactiveClasses}`}
          aria-current={!isEn ? 'page' : undefined}
          aria-label="Switch to Chinese"
        >
          中
        </Link>
        <Link
          href={enPath}
          prefetch={true}
          className={`${itemBaseClasses} ${isEn ? activeClasses : inactiveClasses}`}
          aria-current={isEn ? 'page' : undefined}
          aria-label="Switch to English"
        >
          En
        </Link>
      </div>
    </div>
  );
}
