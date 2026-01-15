'use client';

import React from 'react';
import FloatingActionButtons from '@/domains/interaction/components/FloatingActionButtons';
import { useUIStore } from '@/shared/store/uiStore';

export default function FloatingActionButtonsIsland() {
  const isAdmin = useUIStore((state) => state.isAdmin);
  return <FloatingActionButtons isAdmin={isAdmin} />;
}
