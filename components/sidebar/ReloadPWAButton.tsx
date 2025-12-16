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
    <div className="mt-4 px-3 md:hidden">
      <button
        onClick={handleReload}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
      >
        {isLoading ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
        ) : (
          <span>🔄</span>
        )}
        重载应用 (清除缓存)
      </button>
    </div>
  );
};

export default ReloadPWAButton;
