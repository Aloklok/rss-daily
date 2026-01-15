'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/shared/store/uiStore';

export default function LayoutChromeClient() {
  const isMobileOpen = useUIStore((state) => state.isMobileOpen);
  const isDesktopCollapsed = useUIStore((state) => state.isDesktopCollapsed);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const toggleDesktopSidebar = useUIStore((state) => state.toggleDesktopSidebar);
  const modalArticleId = useUIStore((state) => state.modalArticleId);
  const checkAdminStatus = useUIStore((state) => state.checkAdminStatus);
  const pathname = usePathname();

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    const overlay = document.getElementById('layout-mobile-overlay');
    const sidebar = document.getElementById('layout-sidebar-container');
    const desktopToggle = document.getElementById(
      'layout-desktop-toggle',
    ) as HTMLButtonElement | null;
    const isBrowser = typeof window !== 'undefined';
    const isMobileViewport = isBrowser && window.innerWidth < 768;

    if (overlay) {
      overlay.style.pointerEvents = isMobileOpen ? 'auto' : 'none';
      overlay.style.opacity = isMobileOpen ? '1' : '0';
    }

    if (sidebar) {
      if (isMobileViewport) {
        if (isMobileOpen) {
          sidebar.classList.remove('-translate-x-full');
          sidebar.classList.add('translate-x-0');
        } else {
          sidebar.classList.add('-translate-x-full');
          sidebar.classList.remove('translate-x-0');
        }

        sidebar.style.width = '';
        sidebar.style.opacity = '';
        sidebar.style.overflow = '';
        sidebar.style.transform = '';
      } else if (isBrowser) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        sidebar.style.transform = '';

        sidebar.style.width = isDesktopCollapsed ? '0px' : '';
        sidebar.style.opacity = isDesktopCollapsed ? '0' : '';
        sidebar.style.overflow = isDesktopCollapsed ? 'hidden' : '';
      }
    }

    if (desktopToggle) {
      if (isBrowser && !isMobileViewport && sidebar && !isDesktopCollapsed) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const toggleRect = desktopToggle.getBoundingClientRect();
        const borderX = sidebarRect.right;
        const targetLeft = borderX - toggleRect.width / 2;
        desktopToggle.style.left = `${targetLeft}px`;
      } else {
        desktopToggle.style.left = '';
      }
    }

    if (isBrowser && isMobileViewport && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, isDesktopCollapsed]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileSidebarOpen(false);
    }
  }, [pathname, setMobileSidebarOpen]);

  const transitionClass = 'transition-all duration-300 ease-in-out';

  return (
    <>
      <div
        id="layout-mobile-overlay"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {!modalArticleId && (
        <button
          id="layout-desktop-toggle"
          onClick={toggleDesktopSidebar}
          className={`dark:bg-midnight-card fixed top-5 rounded-full bg-white p-2 shadow-lg hover:shadow-xl ${transitionClass} dark:border-midnight-border z-50 hidden cursor-pointer border border-gray-200 md:block ${
            isDesktopCollapsed ? 'left-5' : 'left-[304px]'
          }`}
          aria-label="Toggle Sidebar"
        >
          {isDesktopCollapsed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-800 dark:text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-800 dark:text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
              <path d="M9 4v16" strokeWidth="2" />
            </svg>
          )}
        </button>
      )}

      {!modalArticleId && (
        <button
          onClick={toggleMobileSidebar}
          className={`fixed top-[13px] right-6 z-[60] rounded-full p-2 md:hidden ${transitionClass} ${
            isMobileOpen
              ? 'bg-gray-800 text-white dark:bg-gray-700'
              : 'dark:bg-midnight-card bg-white text-gray-800 shadow-md dark:text-gray-200'
          } cursor-pointer`}
          aria-label="Toggle Mobile Sidebar"
        >
          {isMobileOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
              <path d="M9 4v16" strokeWidth="2" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}
