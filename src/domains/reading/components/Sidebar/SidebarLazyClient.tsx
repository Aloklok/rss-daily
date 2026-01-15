'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { AvailableFilters } from '@/shared/types';

const SidebarClientMount = dynamic(() => import('./SidebarClientMount'), { ssr: false });

interface SidebarLazyClientProps {
  initialDates: string[];
  initialAvailableFilters: AvailableFilters;
}

export default function SidebarLazyClient({
  initialDates,
  initialAvailableFilters,
}: SidebarLazyClientProps) {
  return (
    <div id="sidebar-client-nav" className="absolute inset-0">
      <SidebarClientMount
        initialDates={initialDates}
        initialAvailableFilters={initialAvailableFilters}
      />
    </div>
  );
}
