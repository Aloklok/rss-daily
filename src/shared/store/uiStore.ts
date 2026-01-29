import { create } from 'zustand';
import { Filter, TimeSlot } from '../types';

// Helper for Shanghai Timezone removed as unused

interface UIStoreState {
  activeFilter: Filter | null;
  timeSlot: TimeSlot | null;
  verdictFilter: string | null;
  selectedArticleId: string | number | null;

  // Modal State
  modalArticleId: string | number | null;
  modalInitialMode: 'briefing' | 'reader';

  // Actions
  setActiveFilter: (filter: Filter | null, preserveState?: boolean) => void;
  setTimeSlot: (slot: TimeSlot | null) => void;
  setVerdictFilter: (filter: string | null) => void;
  setSelectedArticleId: (id: string | number | null) => void;
  openModal: (id: string | number, mode?: 'briefing' | 'reader') => void;
  closeModal: () => void;
  setModalArticleId: (id: string | number | null) => void; // Deprecated compatibility

  // Admin State
  isAdmin: boolean;
  adminStatusChecked: boolean;
  setAdminStatus: (isAdmin: boolean) => void;
  checkAdminStatus: () => Promise<void>;

  // Sidebar State
  isMobileOpen: boolean;
  isDesktopCollapsed: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleDesktopSidebar: () => void;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;

  // Settings State
  theme: 'light' | 'dark';
  fontSize: number;
  lineHeight: number;
  setTheme: (theme: 'light' | 'dark') => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  activeFilter: null,
  timeSlot: null,
  verdictFilter: null,
  selectedArticleId: null,
  modalArticleId: null,
  modalInitialMode: 'briefing',

  setActiveFilter: (filter, preserveState = false) => {
    set((state) => {
      // Only reset timeSlot and verdictFilter if the filter has actually changed.
      // This prevents redundant syncs (like the one in useFilters.ts) from wiping the active timeSlot.
      const isFilterSame =
        state.activeFilter?.type === filter?.type && state.activeFilter?.value === filter?.value;

      // If preserveState is true, we keep the existing slot/verdict.
      // Otherwise, we fallback to the "same filter check" logic.
      const shouldPreserve = preserveState || isFilterSame;

      return {
        activeFilter: filter,
        selectedArticleId: null,
        timeSlot: shouldPreserve ? state.timeSlot : null,
        verdictFilter: shouldPreserve ? state.verdictFilter : null,
      };
    });
  },

  setTimeSlot: (slot) => set({ timeSlot: slot }),
  setVerdictFilter: (filter) => set({ verdictFilter: filter }),
  setSelectedArticleId: (id) => set({ selectedArticleId: id }),

  openModal: (id, mode = 'briefing') =>
    set({
      modalArticleId: id,
      modalInitialMode: mode,
    }),

  closeModal: () =>
    set({
      modalArticleId: null,
      modalInitialMode: 'briefing',
    }),

  setModalArticleId: (id) => set({ modalArticleId: id, modalInitialMode: 'briefing' }),

  // Admin State
  isAdmin: false,
  adminStatusChecked: false,
  setAdminStatus: (isAdmin) => set({ isAdmin, adminStatusChecked: true }),
  checkAdminStatus: async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        set({ isAdmin: !!data.isAdmin, adminStatusChecked: true });
      } else {
        set({ isAdmin: false, adminStatusChecked: true });
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
      set({ isAdmin: false, adminStatusChecked: true });
    }
  },

  // Sidebar State
  isMobileOpen: false, // Default closed on mobile
  isDesktopCollapsed: false, // Default open on desktop

  toggleMobileSidebar: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  setMobileSidebarOpen: (open) => set({ isMobileOpen: open }),

  toggleDesktopSidebar: () => set((state) => ({ isDesktopCollapsed: !state.isDesktopCollapsed })),
  setDesktopSidebarCollapsed: (collapsed) => set({ isDesktopCollapsed: collapsed }),

  // Settings State
  theme: 'light', // Default, will be updated by effect in layout/provider
  fontSize: 16,
  lineHeight: 1.7,
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    }
  },
  setFontSize: (size) => set({ fontSize: size }),
  setLineHeight: (height) => set({ lineHeight: height }),
}));
