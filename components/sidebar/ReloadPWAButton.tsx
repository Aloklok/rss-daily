'use client';

import React, { useState } from 'react';

const ReloadPWAButton: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleReload = async () => {
        if (!confirm('确定要清除缓存并重载应用吗？这将注销所有 Service Worker。')) return;

        setIsLoading(true);
        try {
            // 1. Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Clear Caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            // 3. Reload Page
            window.location.reload();
        } catch (error) {
            console.error('Failed to reload PWA:', error);
            alert('重载失败，请尝试手动刷新。');
            setIsLoading(false);
        }
    };

    return (
        <div className="md:hidden mt-4 px-3">
            <button
                onClick={handleReload}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                ) : (
                    <span>🔄</span>
                )}
                重载应用 (清除缓存)
            </button>
        </div>
    );
};

export default ReloadPWAButton;
