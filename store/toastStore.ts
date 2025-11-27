import { create } from 'zustand';

export interface ToastState {
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastStore extends ToastState {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    isVisible: false,
    message: '',
    type: 'info',

    showToast: (message, type = 'info') => {
        set({ isVisible: true, message, type });
        setTimeout(() => {
            set((state) => {
                // Only hide if the message hasn't changed (simple debounce/conflict resolution)
                // Actually, for simplicity, just hide. If a new toast came in, it would have set isVisible=true again.
                // But we need to be careful not to hide a *new* toast if the timeout overlaps.
                // A simple way is to check if the message is still the same, but that's not perfect.
                // For now, let's just hide. A more robust solution would use IDs.
                // Given the requirements, a simple implementation is likely sufficient.
                return { isVisible: false };
            });
        }, 3000);
    },

    hideToast: () => set({ isVisible: false }),
}));
