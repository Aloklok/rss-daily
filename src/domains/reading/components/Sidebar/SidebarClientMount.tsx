'use client';

import React, { useEffect } from 'react';
import { AvailableFilters } from '@/shared/types';
import SidebarClient from './SidebarContainer';

import { Dictionary } from '@/app/i18n/dictionaries';

interface SidebarClientMountProps {
  initialDates: string[];
  initialAvailableFilters: AvailableFilters;
  dict: Dictionary;
}

export default function SidebarClientMount({
  initialDates,
  initialAvailableFilters,
  dict,
}: SidebarClientMountProps) {
  useEffect(() => {
    const ssr = document.getElementById('sidebar-ssr-nav');
    const skeleton = document.getElementById('sidebar-skeleton');
    const client = document.getElementById('sidebar-client-nav');
    if (client) client.style.display = 'block';
    if (skeleton) skeleton.style.display = 'none';
    if (ssr) ssr.style.display = 'none';
  }, []);

  return (
    <SidebarClient
      initialDates={initialDates}
      initialAvailableFilters={initialAvailableFilters}
      initialStarredHeaders={[]}
      dict={dict}
    />
  );
}
