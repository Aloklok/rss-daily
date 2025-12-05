import { create } from 'zustand';
import { Filter } from '../types';

// Helper for Shanghai Timezone
const getTodayInShanghai = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'
    });
    return formatter.format(new Date());
};

const getCurrentTimeSlotInShanghai = (): 'morning' | 'afternoon' | 'evening' => {
    const now = new Date();
    const hour = parseInt(new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Asia/Shanghai'
    }).format(now), 10);

    if (hour < 12) return 'morning';
    if (hour < 19) return 'afternoon';
    return 'evening';
};

interface UIStoreState {
    activeFilter: Filter | null;
    timeSlot: 'morning' | 'afternoon' | 'evening' | null;
    selectedArticleId: string | number | null;

    // Modal State
    modalArticleId: string | number | null;
    modalInitialMode: 'briefing' | 'reader';

    // Actions
    setActiveFilter: (filter: Filter | null) => void;
    setTimeSlot: (slot: 'morning' | 'afternoon' | 'evening' | null) => void;
    setSelectedArticleId: (id: string | number | null) => void;
    openModal: (id: string | number, mode?: 'briefing' | 'reader') => void;
    closeModal: () => void;
    setModalArticleId: (id: string | number | null) => void; // Deprecated compatibility

    // Admin State
    isAdmin: boolean;
    checkAdminStatus: () => Promise<void>;

    // Sidebar State
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;

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
    selectedArticleId: null,
    modalArticleId: null,
    modalInitialMode: 'briefing',

    setActiveFilter: (filter) => {
        let newTimeSlot: 'morning' | 'afternoon' | 'evening' | null = null;

        // Calculate timeSlot based on filter
        if (filter?.type === 'date') {
            const today = getTodayInShanghai();
            if (filter.value === today) {
                newTimeSlot = getCurrentTimeSlotInShanghai();
            }
        }

        set({
            activeFilter: filter,
            selectedArticleId: null,
            timeSlot: newTimeSlot
        });
    },

    setTimeSlot: (slot) => set({ timeSlot: slot }),
    setSelectedArticleId: (id) => set({ selectedArticleId: id }),

    openModal: (id, mode = 'briefing') => set({
        modalArticleId: id,
        modalInitialMode: mode
    }),

    closeModal: () => set({
        modalArticleId: null,
        modalInitialMode: 'briefing'
    }),

    setModalArticleId: (id) => set({ modalArticleId: id, modalInitialMode: 'briefing' }),

    // Admin State
    isAdmin: false,
    checkAdminStatus: async () => {
        try {
            const res = await fetch('/api/auth/check');
            const data = await res.json();
            set({ isAdmin: data.isAdmin });
        } catch (error) {
            console.error('Failed to check admin status:', error);
            set({ isAdmin: false });
        }
    },

    // Sidebar State
    isSidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

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
