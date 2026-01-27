import React from 'react';
import { AvailableFilters } from '@/shared/types';
import LayoutChromeClient from '@/shared/components/layout/LayoutChromeClient';
import SidebarNavServer from '@/domains/reading/components/Sidebar/SidebarNavServer';
import SidebarLazyClient from '@/domains/reading/components/Sidebar/SidebarLazyClient';
import FloatingActionButtonsIsland from '@/domains/interaction/components/FloatingActionButtonsIsland';
import LanguageSwitcher from '@/shared/components/i18n/LanguageSwitcher';

import { Dictionary } from '@/app/i18n/dictionaries';

interface MainLayoutServerProps {
  children: React.ReactNode;
  initialDates: string[];
  initialAvailableFilters: AvailableFilters;
  dict: Dictionary;
}

export default function MainLayoutServer({
  children,
  initialDates,
  initialAvailableFilters,
  dict,
}: MainLayoutServerProps) {
  return (
    <div className="dark:bg-midnight-sidebar flex min-h-screen flex-col bg-gray-50 font-sans md:flex-row">
      <LayoutChromeClient />
      <div
        id="layout-sidebar-container"
        className="dark:bg-midnight-sidebar dark:border-midnight-sidebar fixed top-0 left-0 z-50 h-[100dvh] h-full w-64 flex-shrink-0 -translate-x-full border-r border-transparent bg-gray-50 transition-transform duration-300 md:sticky md:top-0 md:z-auto md:h-screen md:w-80 md:translate-x-0"
      >
        <div className="relative h-full w-full">
          <div
            id="sidebar-ssr-nav"
            className="absolute inset-0 opacity-100 transition-opacity duration-200"
          >
            <SidebarNavServer
              initialDates={initialDates}
              initialAvailableFilters={initialAvailableFilters}
              dict={dict}
            />
          </div>
          <div id="sidebar-skeleton" className="absolute inset-0" aria-hidden="true">
            <div className="dark:bg-midnight-sidebar dark:border-midnight-border flex h-full w-full flex-col space-y-4 border-r border-gray-200 bg-gray-50 px-4 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="dark:bg-midnight-card h-12 w-12 animate-pulse rounded-full bg-gray-200" />
                  <div className="space-y-2">
                    <div className="dark:bg-midnight-card h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="dark:bg-midnight-card h-4 w-16 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
                <div className="dark:bg-midnight-card h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              </div>
              <div className="space-y-3">
                <div className="dark:bg-midnight-card h-5 w-28 animate-pulse rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="dark:bg-midnight-card h-9 w-full animate-pulse rounded bg-gray-200" />
                  <div className="dark:bg-midnight-card h-9 w-full animate-pulse rounded bg-gray-200" />
                  <div className="dark:bg-midnight-card h-9 w-full animate-pulse rounded bg-gray-200" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="dark:bg-midnight-card h-5 w-24 animate-pulse rounded bg-gray-200" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="dark:bg-midnight-card h-8 w-full animate-pulse rounded bg-gray-200" />
                  <div className="dark:bg-midnight-card h-8 w-full animate-pulse rounded bg-gray-200" />
                  <div className="dark:bg-midnight-card h-8 w-full animate-pulse rounded bg-gray-200" />
                  <div className="dark:bg-midnight-card h-8 w-full animate-pulse rounded bg-gray-200" />
                </div>
              </div>
              <div className="dark:bg-midnight-card mt-auto h-12 w-full animate-pulse rounded-xl bg-gray-200" />
            </div>
          </div>
          <SidebarLazyClient
            initialDates={initialDates}
            initialAvailableFilters={initialAvailableFilters}
            dict={dict}
          />
        </div>
      </div>

      <div className="dark:bg-midnight-bg bg-paper-texture relative flex min-w-0 flex-1 flex-col bg-neutral-50 dark:bg-none">
        <LanguageSwitcher />
        <div className="mx-auto w-full max-w-3xl px-2 pt-2 md:px-8 md:pt-4 2xl:max-w-5xl">
          {children}
        </div>
        <FloatingActionButtonsIsland />
      </div>
    </div>
  );
}
