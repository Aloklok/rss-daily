import { useState, useCallback } from 'react';

export interface ToastState {
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
}

export const useAppToast = () => {
    const [toast, setToast] = useState<ToastState>({
        isVisible: false,
        message: '',
        type: 'info'
    });

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ isVisible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
    }, []);

    return {
        toast,
        showToast,
        hideToast
    };
};
