'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/shared/store/uiStore';
import { useArticleStore } from '@/domains/interaction/store/articleStore'; // Import article store
import SidebarClient from '@/domains/reading/components/Sidebar/SidebarContainer';
import FloatingActionButtons from '@/domains/interaction/components/FloatingActionButtons';
import { Dictionary } from '@/app/i18n/dictionaries';

interface MainLayoutClientProps {
  children: React.ReactNode;
  initialDates: string[];
  initialAvailableFilters: { tags: any[]; categories: any[] };
  initialStarredHeaders?: { id: string | number; title: string; tags: string[] }[]; // Update type
  dict: Dictionary;
}

export default function MainLayoutClient({
  children,
  initialDates,
  initialAvailableFilters,
  initialStarredHeaders = [],
  dict,
}: MainLayoutClientProps) {
  // Use new split state
  const isMobileOpen = useUIStore((state) => state.isMobileOpen);
  const isDesktopCollapsed = useUIStore((state) => state.isDesktopCollapsed);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const toggleDesktopSidebar = useUIStore((state) => state.toggleDesktopSidebar);
  const pathname = usePathname();

  const checkAdminStatus = useUIStore((state) => state.checkAdminStatus);
  const isAdmin = useUIStore((state) => state.isAdmin);
  const modalArticleId = useUIStore((state) => state.modalArticleId);

  // Initialize admin status and article filters immediately (Synchronous Hydration)
  const initialized = useRef(false);
  if (!initialized.current) {
    // Admin status initialized via client side effect
    // Hydrate filters immediately to prevent layout shift (tag container FOUC)
    if (
      initialAvailableFilters &&
      (initialAvailableFilters.tags.length > 0 || initialAvailableFilters.categories.length > 0)
    ) {
      useArticleStore.setState({ availableFilters: initialAvailableFilters });
    }
    initialized.current = true;
  }

  // Fetch admin status on mount (Client-Side Only to avoid Cookie Dynamic Opt-out)
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Handle body overflow for mobile sidebar only
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Standard ref for Main Content (unused but kept for potential scroll handling)
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  const transitionClass = 'transition-all duration-300 ease-in-out';

  return (
    <div className="dark:bg-midnight-sidebar flex min-h-screen flex-col bg-gray-50 font-sans md:flex-row">
      {/* Mobile Overlay: Hidden on Desktop (md:hidden) */}
      {/* Only show if Mobile Sidebar is Open */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      {/* 
          Mobile: fixed, left-0, full height, z-50. transform controlled by isMobileOpen.
          Desktop: sticky, top-0,h-screen, z-40. width controlled by isDesktopCollapsed.
      */}
      <div
        className={`dark:bg-midnight-sidebar dark:border-midnight-sidebar h-full flex-shrink-0 border-r border-transparent bg-gray-50 ${transitionClass} fixed top-0 left-0 z-50 h-[100dvh] w-64 md:sticky md:top-0 md:z-auto md:h-screen ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isDesktopCollapsed ? 'md:w-0 md:overflow-hidden md:border-none md:opacity-0' : 'md:w-80 md:opacity-100'} `}
      >
        <SidebarClient
          initialDates={initialDates}
          initialAvailableFilters={initialAvailableFilters}
          initialStarredHeaders={initialStarredHeaders}
          dict={dict}
        />
      </div>

      {/* Desktop Toggle Button */}
      {/* Desktop Toggle Button - HIDE when modal is open */}
      {!modalArticleId && (
        <button
          onClick={toggleDesktopSidebar}
          className={`dark:bg-midnight-card fixed top-5 rounded-full bg-white p-2 shadow-lg hover:shadow-xl ${transitionClass} dark:border-midnight-border z-50 hidden cursor-pointer border border-gray-200 md:block ${isDesktopCollapsed ? 'left-5' : 'left-[304px]'}`}
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

      {/* Mobile Toggle Button */}
      {/* Mobile Toggle Button - HIDE when modal is open */}
      {!modalArticleId && (
        <button
          onClick={toggleMobileSidebar}
          className={`fixed top-4 right-6 z-50 rounded-full p-2 md:hidden ${transitionClass} ${isMobileOpen ? 'bg-gray-800 text-white' : 'bg-white/20 text-white'} cursor-pointer`}
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

      {/* Main Content Area */}
      <div
        ref={mainContentRef}
        className={`dark:bg-midnight-bg bg-paper-texture flex min-w-0 flex-1 flex-col bg-neutral-50 dark:bg-none`}
      >
        <div
          className={`mx-auto w-full px-2 pt-2 md:px-8 md:pt-4 ${
            pathname === '/admin/briefing' ? 'max-w-7xl' : 'max-w-3xl 2xl:max-w-5xl'
          }`}
        >
          {children}
        </div>
        <FloatingActionButtons isAdmin={isAdmin} />
      </div>
    </div>
  );
}
