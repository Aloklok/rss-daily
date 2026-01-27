'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { AvailableFilters } from '@/shared/types';

const SidebarClientMount = dynamic(() => import('./SidebarClientMount'), { ssr: false });

import { Dictionary } from '@/app/i18n/dictionaries';

interface SidebarLazyClientProps {
  initialDates: string[];
  initialAvailableFilters: AvailableFilters;
  dict: Dictionary;
}

export default function SidebarLazyClient({
  initialDates,
  initialAvailableFilters,
  dict,
}: SidebarLazyClientProps) {
  return (
    <div id="sidebar-client-nav" className="absolute inset-0">
      <SidebarClientMount
        initialDates={initialDates}
        initialAvailableFilters={initialAvailableFilters}
        dict={dict}
      />
    </div>
  );
}
