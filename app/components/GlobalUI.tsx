'use client';

import React from 'react';
import Toast from './Toast';
import { useAppToast } from '../../hooks/useAppToast';

export default function GlobalUI() {
    const { toast, hideToast } = useAppToast();

    return (
        <>
            <Toast
                message={toast.message}
                isVisible={toast.isVisible}
                onClose={hideToast}
                type={toast.type}
            />
        </>
    );
}
